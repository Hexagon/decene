import ipaddrJs from 'ipaddr.js';

class IPVotes {
  private votes: any;

  constructor() {
    this.votes = {};
  }

  private ipCheck(ip: string) {
    try {
      let parsedIp: ipaddrJs.IPv4 | ipaddrJs.IPv6 = ipaddrJs.parse(ip);
      return parsedIp;
    } catch (e) {
      return null;
    }
  }

  public add(ip: string): string | false | undefined {
    // Check ip
    let ipAddr = this.ipCheck(ip);
    if (ipAddr === null) {
      return false;
    }

    // Do not act on private ips
    if (['linkLocal', 'private', 'loopback'].includes(ipAddr.range())) {
      return false;
    }

    this.votes[ip] = (this.votes[ip] || 0) + 1;

    let voteCount = 0;
    let winner;

    for (const currentIp of Object.keys(this.votes)) {
      const currentVotes = this.votes[currentIp];
      if (currentVotes && currentVotes > voteCount) {
        voteCount = currentVotes;
        winner = currentIp;
      }
    }

    return winner;
  }
}

export default IPVotes;
