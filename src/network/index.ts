import Node from './peer';
import Message from './message';
import MessageSerialized from './messageserialized';
import Registry from './registry';
import Address from './address';
import Pool from './pool';
import tls, { TLSSocket } from 'tls';
import Cron from 'croner';
import ipaddrJs from 'ipaddr.js';
import EventEmitter from 'events';
import natUpnp from 'nat-upnp';
import Peer from './peer';
import { IIdentity } from '../encryption/identity';
import Socket from './socket';

class Network {
  private events: EventEmitter;
  private id: IIdentity;
  private state: string;
  private upnp: boolean;
  private tryingupnp: boolean;
  private hostInventory: any;
  private node: Peer;
  private reg: Registry;
  private pool: Pool;
  private connectivity: string;
  private spawn?: Address;
  private upnpc?: natUpnp.Client;

  constructor(id: IIdentity, host: string, port: number, spawnAddress: string, cache: boolean) {
    this.events = new EventEmitter();

    this.id = id;

    this.state = 'booting';
    this.upnp = false;

    this.tryingupnp = false;

    this.hostInventory = {};

    this.node = new Peer(new Address(host, port), 'alive', this.id.uuid);

    this.reg = new Registry(this.events, this.node, cache);

    this.pool = new Pool(this.events, this.id, this.reg);

    // Set and keep track of connectivity
    this.connectivity = 'offline';
    this.events.on('socket:incoming', () => (this.connectivity = 'verified' + (this.upnp ? ' (upnp)' : '')));

    // Handle incoming messages
    this.events.on('message:incoming', (message, socket) => this.receive(message, socket));

    // Handle discovered nodes
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

  setState(state: string) {
    if (state !== this.state) {
      this.events.emit('state:changed', this.state, state);
      this.state = state;
    }
  }

  loop() {
    const _locator = Cron('*/5 * * * * *', () => {
      // Make nodes pending
      this.reg.invalidate();

      // Find and ping random pending node
      const firstPending = this.reg.first('pending');
      if (firstPending) {
        this.send(
          firstPending,
          new Message('ping', { node: this.node }),
          (err: Error) => err && this.events.emit('error', new Error('Error during ping: ' + err)),
        );

        // Ping spawn if registry is empty
      } else if (this.spawn) {
        this.send(
          this.spawn,
          new Message('ping', { node: this.node }),
          (err: Error) => err && this.events.emit('error', new Error('Error during spawn ping: ' + err)),
        );
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
      true,
    );
  }

  broadcast(message: Message) {
    const all = this.reg.all('alive');
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
    this.events.emit('message:received', message, socket);

    try {
      // Act on incoming messages
      if (message.type === 'registry') {
        // Handle incoming batch update
        if (message.payload && message.payload.registry) {
          this.reg.batchUpdate(message.payload.registry);
        }
      } else if (message.type === 'locate') {
        this.reply(socket, new Message('registry', { registry: this.reg.serialize() }), (err: Error) =>
          this.events.emit('error', 'Error during reply ' + err),
        );
      } else if (message.type === 'ping') {
        // Handle from node
        if (message.payload && message.payload.node) {
          const resolvedNode = new Peer(message.payload.node.address, 'pending', message.payload.node.uuid);
          socket.setNode(resolvedNode);
          this.reg.update(resolvedNode, socket);

          this.reply(
            socket,
            new Message('pong', { node: this.node, publicIp: socket.remoteAddress }),
            (err: Error) => err && this.events.emit('error', new Error('Error during reply: ')),
          );
        }
      } else if (message.type === 'pong') {
        // Handle from node
        if (message.payload && message.payload.node) {
          const resolvedNode: Peer = new Node(message.payload.node.address, 'alive', message.payload.node.uuid);
          socket.setNode(resolvedNode);
          this.reg.update(resolvedNode, socket);
        }
        // Handle public ip votes
        if (message.payload && message.payload.publicIp) {
          this.votePublicIp(message.payload.publicIp);
        }
      }
    } catch (e) {
      this.events.emit('error', 'Failed to receive message: ' + e);
    }
  }

  votePublicIp(ip: string) {
    try {
      if (!ip || (ip && ipaddrJs.parse(ip).range() === 'private')) {
        this.node.address.type = 'private';
        return;
      }
    } catch (e) {
      this.events.emit('error', new Error('Invalid public ip received from remote node: ' + ip));
      return;
    }

    this.hostInventory[ip] = (this.hostInventory[ip] || 0) + 1;

    let votes = 0;
    let winner;

    for (const currentIp of Object.keys(this.hostInventory)) {
      const currentVotes = this.hostInventory[currentIp];
      if (currentVotes && currentVotes > votes) {
        votes = currentVotes;
        winner = currentIp;
      }
    }

    if (winner && winner !== this.node.address.ip) {
      this.node.address.ip = winner;
      this.node.address.type = 'public';
      this.events.emit('ip:changed', winner);
    }
  }
}

export default Network;
