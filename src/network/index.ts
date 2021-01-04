import Message from './message';
import MessageSerialized from './interfaces/messageserialized';
import Registry from './registry';
import Address from './address';
import Pool from './pool';
import tls, { TLSSocket } from 'tls';
import Cron from 'croner';
import EventEmitter from 'events';
import natUpnp from 'nat-upnp';
import Peer from './peer';
import PeerStatus from './enums/peerstatus';
import { IIdentity } from '../encryption/identity';
import Socket from './socket';
import IPVotes from './ipvotes';

class Network {
  private events: EventEmitter;
  private id: IIdentity;
  private upnp: boolean;
  private tryingupnp: boolean;
  private votes: IPVotes;
  private node: Peer;
  private reg: Registry;
  private pool: Pool;
  private connectivity: string;
  private spawn?: Address;
  private upnpc?: natUpnp.Client;

  constructor(id: IIdentity, host: string, port: number, spawnAddress: string, cache: boolean) {
    this.events = new EventEmitter();

    this.id = id;

    this.upnp = false;

    this.tryingupnp = false;

    this.votes = new IPVotes();

    this.node = new Peer(new Address(host, port), PeerStatus.Alive, this.id.uuid);

    this.reg = new Registry(this.events, this.node, cache);

    this.pool = new Pool(this.events, this.id, this.reg);

    // Set and keep track of connectivity
    this.connectivity = 'offline';
    this.events.on('socket:incoming', () => (this.connectivity = 'verified' + (this.upnp ? ' (upnp)' : '')));

    // Handle incoming messages
    this.events.on('message:incoming', (message, socket) => this.receive(message, socket));

    // Always request registry from newly discovered nodes
    this.events.on('node:discover', (node) => this.locate(node));

    this.createServer();

    this.loop();

    // Add spawn
    if (spawnAddress) {
      this.spawn = new Address(spawnAddress);
    }
  }

  createServer() {
    tls
      .createServer(
        {
          key: this.id.key.private,
          cert: this.id.key.cert,
          rejectUnauthorized: false,
        },
        (connection) => {
          this.events.emit('socket:incoming', connection);
        },
      )
      .listen(this.node.address.port, this.node.address.ip, (err: Error, port: number) =>
        this.events.emit('server:listening', this.node.address),
      );
  }

  tryUpnp() {
    if (!this.tryingupnp) {
      this.tryingupnp = true;

      this.events.emit('upnp:trying');
      this.connectivity = 'upnp-try';

      this.upnpc = natUpnp.createClient();

      this.upnpc.portMapping(
        {
          public: this.node.address.port,
          private: this.node.address.port,
          ttl: 240,
        },
        (err) => {
          if (err) {
            this.events.emit('upnp:fail', err);
            this.connectivity = 'upnp-fail';
          } else {
            this.events.emit('upnp:success');
            this.connectivity = 'upnp-success';
            this.upnp = true;
          }
          this.tryingupnp = false;
        },
      );
    }
  }

  loop() {
    // Ping a pending node every fifth second
    const _locator = Cron('*/5 * * * * *', () => {
      // Refresh registry
      this.reg.invalidate();

      // Find and ping random pending node
      const randomPending = this.reg.random(PeerStatus.Pending);
      if (randomPending) {
        this.send(
          randomPending,
          new Message('ping', { node: this.node }),
          (err: Error) => err && this.events.emit('error', new Error('Error during ping: ' + err)),
        );
      } else if (this.reg.all(PeerStatus.Alive).length > 0) {
        // Find and ping random alive node
        const randomAlive = this.reg.random(PeerStatus.Alive);
        if (randomAlive) {
          this.send(
            randomAlive,
            new Message('ping', { node: this.node }),
            (err: Error) => err && this.events.emit('error', new Error('Error during ping: ' + err)),
          );
        }
        // Ping spawn if registry is empty
      } else if (this.spawn && this.reg.all(PeerStatus.Alive).length === 0) {
        this.send(
          this.spawn,
          new Message('ping', { node: this.node }),
          (err: Error) => err && this.events.emit('error', new Error('Error during spawn ping: ' + err)),
        );
      }
    });

    // Send discovery to a random alive node every 30 seconds
    const _discoverer = Cron('*/30 * * * * *', () => {
      // Find and ping random pending node
      const randomAlive = this.reg.random(PeerStatus.Alive);
      if (randomAlive) {
        this.locate(randomAlive);
      }
    });
  }

  reply(socket: Socket, message: Message, callback: any) {
    if (!socket) {
      this.events.emit('error', new Error("Tried to reply to 'undefined'"));
      return;
    }

    const messageSerialized: MessageSerialized = message.serialize();

    this.events.emit('message:reply', socket, messageSerialized);
    this.pool.reply(socket, messageSerialized, callback);
  }

  send(dest: Peer | Address, message: Message, callback: any, noCache?: boolean) {
    if (!dest) {
      this.events.emit('error', new Error("Tried to send to 'undefined'"));
      return;
    }

    const messageSerialized = message.serialize();

    this.events.emit('message:send', dest, message);
    this.pool.send(dest, message, callback, noCache);
  }

  locate(node: Peer) {
    this.send(
      node,
      new Message('locate', {}),
      (err: Error) => err && this.events.emit('error', new Error('Error during locate: ' + err)),
    );
  }

  broadcast(message: Message) {
    const all = this.reg.all(PeerStatus.Alive);
    if (this.node !== undefined && all.length > 0) {
      for (const n of all) {
        this.send(
          n,
          new Message('broadcast', { message }),
          (err: Error) => err && this.events.emit('error', new Error('Error during broadcast: ' + err)),
        );
      }
      return true;
    } else {
      return false;
    }
  }

  receive(message: MessageSerialized, socket: Socket) {
    // Bail out if message.type is missing
    if (!message.type) {
      this.events.emit('error', 'Invalid message received');
      return;
    }

    // Run default message handlers
    switch (message.type) {
      case 'registry': {
        // Handle incoming batch update
        if (message.payload && message.payload.registry) {
          this.reg.batchUpdate(message.payload.registry);
        }
        break;
      }
      case 'locate': {
        this.reply(socket, new Message('registry', { registry: this.reg.serialize(PeerStatus.Alive) }), (err: Error) =>
          this.events.emit('error', 'Error during reply ' + err),
        );
        break;
      }
      case 'ping': {
        if (message.payload && message.payload.node) {
          // Handle from peer
          const resolvedPeer = this.handleFromPeer(socket, message);

          // Try to send a public pong, informing remote peer of it's connectivity, set noCache to true to use a new connection
          if (resolvedPeer) {
            this.send(
              resolvedPeer,
              new Message('publicpong', { node: this.node, publicIp: socket.remoteAddress }),
              (err: Error) => err && this.events.emit('error', new Error('Error during reply: ')),
              true,
            );
          }

          // Send a reply on active socket, so that the remote peer gets a reply even if it's not publically available
          this.reply(
            socket,
            new Message('pong', { node: this.node }),
            (err: Error) => err && this.events.emit('error', new Error('Error during reply: ')),
          );
        }
        break;
      }
      case 'pong': {
        // Handle from node
        this.handleFromPeer(socket, message);
        break;
      }
      case 'publicpong': {
        // Handle from node
        this.handleFromPeer(socket, message);

        // Handle public ip votes
        if (message.payload && message.payload.publicIp) {
          this.votePublicIp(message.payload.publicIp);
        }
        break;
      }
      default: {
        // Notify event system that a unhandled message arrived
        this.events.emit('message:unhandled', message, socket);
        break;
      }
    }

    // Notify event system that a message arrived
    this.events.emit('message:received', message, socket);
  }

  handleFromPeer(socket?: Socket, message?: MessageSerialized): Peer | undefined {
    // Use ip from active socket, use port from supplied information
    if (socket && socket.remoteAddress && message && message.payload && message.payload.node) {
      const resolvedAddress = new Address(socket.remoteAddress, message.payload.node.address.port);
      const resolvedNode = new Peer(resolvedAddress, PeerStatus.Alive, message.payload.node.uuid);
      socket.setNode(resolvedNode);
      this.reg.update(resolvedNode, socket);
      return resolvedNode;
    }
  }
  votePublicIp(ip: string) {
    const winner = this.votes.add(ip);
    if (winner && winner !== this.node.address.ip) {
      this.node.address.ip = winner;
      this.node.address.type = 'public';
      this.events.emit('ip:changed', winner);
    } else if (winner === false && this.node.address.type !== 'public') {
      this.node.address.type = 'private';
    }
  }
}

export default Network;
