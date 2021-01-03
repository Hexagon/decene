class Address {
  public ip: string;
  public port?: number;
  public type: string;

  constructor(ip: string, port?: number, type?: string) {
    this.ip = ip;
    this.port = port;
    this.type = type || 'unknown';

    // Make port
    if (ip && ip.indexOf && ip.indexOf(':') > 0) {
      const sArr = ip.split(':');
      if (sArr.length === 2 && !isNaN(parseInt(sArr[1], 10))) {
        this.ip = sArr[0];
        this.port = parseInt(sArr[1], 10);
      }
    }
  }

  toString() {
    return this.ip + ':' + this.port;
  }
}

export default Address;
