import Address from './address';
import { EventEmitter } from 'events';
import Peer from './peer';
import PeerStatus from './enums/peerstatus';
import Socket from './socket';

class Registry {
  private events: EventEmitter;
  private r: any;
  private node: Peer;

  constructor(mediator: EventEmitter, self: Peer, cache: any) {
    this.node = self;

    this.r = {};

    this.events = mediator;

    if (cache) {
      this.batchUpdate(cache);
    }
  }
  get(uuid: string) {
    return this.r[uuid];
  }
  first(status: string) {
    const result = [];
    for (const currIndex of Object.keys(this.r)) {
      const currNode: Peer = this.r[currIndex];
      if (currNode && (!status || currNode.status === status)) {
        return currNode;
      }
    }
  }
  random(status: PeerStatus) {
    const result = [];

    for (const currIndex of Object.keys(this.r)) {
      const currNode: Peer = this.r[currIndex];
      if (currNode && (!status || currNode.status === status)) {
        result.push(currNode);
      }
    }

    if (result.length > 0) {
      return result[Math.floor(Math.random() * result.length)];
    } else {
      return;
    }
  }
  all(status: PeerStatus) {
    const result = [];
    for (const currIndex of Object.keys(this.r)) {
      const currNode: Peer = this.r[currIndex];
      if (currNode && (!status || currNode.status === status)) {
        result.push(currNode);
      }
    }
    return result;
  }
  count(status: PeerStatus) {
    const result = [];
    for (const currIndex of Object.keys(this.r)) {
      const currNode: Peer = this.r[currIndex];
      if (!status || currNode.status === status) {
        result.push(currNode);
      }
    }
    return result.length;
  }
  invalidate() {
    for (const currIndex of Object.keys(this.r)) {
      const currNode: Peer = this.r[currIndex];

      // Kill nodes after being pending for 24 hours
      if (currNode.lastUpdate && Date.now() - currNode.lastUpdate > 24 * 60 * 60 * 1000) {
        this.events.emit('node:dead', currNode);
        this.r[currIndex] = undefined;

        // Flag nodes for ping after 30 seconds
      } else if (currNode.lastUpdate && Date.now() - currNode.lastUpdate > 30000) {
        this.events.emit('node:invalidate', currNode);
        currNode.invalidate();
      }
    }
  }
  update(n: Peer, socket?: Socket) {
    const resolved = new Peer(n.address, n.status, n.uuid);
    if (resolved && resolved.uuid !== this.node.uuid) {
      if (socket && socket.remoteAddress) {
        resolved.address = new Address(socket.remoteAddress, resolved.address ? resolved.address.port : 0);
      }
      if (resolved.uuid && !this.r[resolved.uuid] && n.uuid) {
        this.r[n.uuid] = resolved;
        this.events.emit('node:discover', resolved);
      } else if (n.uuid) {
        this.r[n.uuid] = resolved;
        this.events.emit('node:update', resolved);
      }
      resolved.flagUpdated();
    }
  }
  batchUpdate(r: any) {
    // Only import alive nodes
    // change all to pending on import

    for (const currIndex of Object.keys(r)) {
      const n: Peer = r[currIndex];
      if (n) {
        if (n.uuid && !this.r[n.uuid]) {
          n.status = PeerStatus.Pending;
        } else if (n.uuid) {
          n.status = this.r[n.uuid].status;
          n.lastUpdate = Math.max(this.r[n.uuid].lastUpdate, this.r[n.uuid].lastUpdate);
        }
        this.update(n);
      }
    }

    this.events.emit('registry:batch');
  }

  serialize(status?: PeerStatus.Alive) {
    const result: any = {};
    for (const currIndex of Object.keys(this.r)) {
      const currNode: Peer = this.r[currIndex];
      if (currNode && (!status || currNode.status === status)) {
        result[currIndex] = currNode;
      }
    }
    return result;
  }

  isEmpty() {
    return !Object.values(this.r).length;
  }
}

export default Registry;
