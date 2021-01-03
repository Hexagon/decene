import Address from './address';

class Peer {
  public uuid?: string;
  public address: Address;
  public status: string;
  public lastUpdate: number | undefined;

  constructor(addr: Address, status: string, uuid?: string) {
    this.uuid = uuid;
    this.address = addr;
    this.status = status;
    this.lastUpdate = undefined;
  }

  toString(): string {
    if (this.address) {
      return this.address.ip + ':' + this.address.port;
    } else {
      return '';
    }
  }

  flagUpdated() {
    this.lastUpdate = Date.now();
  }

  invalidate() {
    this.status = 'pending';
  }
}

export default Peer;
