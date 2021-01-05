import ipaddrJs from 'ipaddr.js';

interface IWinner {
  ip?: string;
  type: 'public' | 'private' | 'none';
}

class IPVotes {
  private privateVotes: any;
  private publicVotes: any;

  constructor() {
    this.privateVotes = {};
    this.publicVotes = {};
  }

  private ipCheck(ip: string) {
    try {
      const parsedIp: ipaddrJs.IPv4 | ipaddrJs.IPv6 = ipaddrJs.parse(ip);
      return parsedIp;
    } catch (e) {
      return null;
    }
  }

  public add(ip: string, type: 'public' | 'private'): IWinner | false | undefined {
    // Check ip
    const ipAddr = this.ipCheck(ip);
    if (ipAddr === null) {
      return false;
    }

    // Do not act on private (local) ips
    ipAddr.range();
    if (['linkLocal', 'private', 'loopback', 'carrierGradeNat'].includes(ipAddr.range())) {
      return false;
    }

    if (type === 'public') {
      this.publicVotes[ip] = (this.publicVotes[ip] || 0) + 1;
    } else {
      this.privateVotes[ip] = (this.privateVotes[ip] || 0) + 1;
    }
  }

  public winner(): IWinner {
    // Check public votes
    let publicVoteCount = 0;
    let publicWinner;

    for (const currentIp of Object.keys(this.publicVotes)) {
      const currentVotes = this.publicVotes[currentIp];
      if (currentVotes && currentVotes > publicVoteCount) {
        publicVoteCount = currentVotes;
        publicWinner = currentIp;
      }
    }

    if (publicWinner) {
      const winner: IWinner = {
        ip: publicWinner,
        type: 'public',
      };
      return winner;
    }

    // Check private votes
    let privateVoteCount = 0;
    let privateWinner;

    for (const currentIp of Object.keys(this.privateVotes)) {
      const currentVotes = this.privateVotes[currentIp];
      if (currentVotes && currentVotes > privateVoteCount) {
        privateVoteCount = currentVotes;
        privateWinner = currentIp;
      }
    }

    if (privateWinner) {
      const winner: IWinner = {
        ip: privateWinner,
        type: 'private',
      };
      return winner;
    }

    return {
      type: 'none',
    };
  }
}

export { IPVotes, IWinner };
