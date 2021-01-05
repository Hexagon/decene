import Address from './address';

enum PeerStatus {
  Pending = 'pending',
  Alive = 'alive',
  Dead = 'dead',
}

class Peer {
  public uuid?: string;
  public address: Address;
  public status: PeerStatus;
  public lastUpdate: number | undefined;

  constructor(addr: Address, status: PeerStatus, uuid?: string) {
    this.uuid = uuid;
    this.address = addr;
    this.status = status;
    this.lastUpdate = undefined;
  }
  flagUpdated() {
    this.lastUpdate = Date.now();
  }

  invalidate() {
    this.status = PeerStatus.Pending;
  }
}

export { Peer, PeerStatus };
