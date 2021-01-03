import Socket from './socket';
import Address from './address';
import Peer from './peer';
import Message from './message';
import MessageSerialized from './messageserialized';
import { IIdentity } from '../encryption/identity';
import { EventEmitter } from 'events';
import Registry from './registry';
import { TlsOptions, TLSSocket } from 'tls';

class Pool {
  private id: IIdentity;
  private connections: any;
  private reg: Registry;
  private events: EventEmitter;
  constructor(mediator: EventEmitter, id: IIdentity, registry: Registry) {
    this.id = id;
    this.connections = {};
    this.reg = registry;
    this.events = mediator;

    this.events.on('socket:incoming', (s) => this.incoming(s));
  }

  incoming(sIncoming: TLSSocket) {
    const s = new Socket(this.id, sIncoming);
    s.events.on('message', (message: Message) => {
      this.events.emit('message:incoming', message, s);
    });
    s.events.once('disconnected', (node) => {
      this.connections[node.uuid] = undefined;
    });
    s.events.on('error', (err: Error) => this.events.emit('socket:error', err));
  }

  send(peer: Address | Peer, message: MessageSerialized, callback?: any, noCache?: boolean) {
    // Find destination
    let destination: Peer | undefined;
    if (peer instanceof Address) {
      destination = new Peer(peer, 'pending');
    } else if (peer instanceof Peer) {
      if (peer.uuid) destination = this.reg.get(peer.uuid);
    }

    // Bail out if destination not found
    if (!destination) {
      callback && callback(new Error('Recipient not found.'), destination);
      return;
    }

    // Check if connection exists
    if (destination.uuid) {
      if (!noCache && this.connections[destination.uuid]) {
        if (this.connections[destination.uuid].send(message)) {
          callback && callback(undefined, destination);
          return;
        } else {
          callback && callback(new Error('Unknown error'));
        }
      }
    }

    // Create connection
    if (destination.address && destination.address.ip) {
      const c = new Socket(this.id, destination);
      c.events.once('connected', () => {
        c.send(message);
        callback && callback(undefined, destination);
      });
      c.events.once('disconnected', () => {
        if (destination && destination.uuid) {
          if (!noCache) this.connections[destination.uuid] = undefined;
          callback && callback(new Error('Connection failed'));
        }
      });
      c.events.on('message', (msg) =>
        this.events.emit('message:incoming', msg, c, destination ? destination.uuid : undefined),
      );
      c.events.on('error', (err: Error) => this.events.emit('socket:error', err));

      if (!noCache && destination.uuid) this.connections[destination.uuid] = c;
    }
  }

  reply(socket: Socket, message: MessageSerialized, callback?: any) {
    try {
      socket.send(message);
      callback && callback(undefined, socket);
    } catch (e) {
      callback && callback(new Error('Socket not connected:' + e));
    }
  }
}

export default Pool;
