var Node = require("./node.js"),
    Message = require("./message.js"),
    Registry = require("./registry.js"),
    Address = require("./address.js"),
    Vec = require("./vec.js"),
    Socket = require("./socket.js"),

    net = require('net'),

    Cron = require('croner'),
    uuidv1 = require('uuid/v1'),

    ipaddrJs = require('ipaddr.js');
const 
    EventEmitter = require('events');

var natUpnp = require('nat-upnp');

class Decent {

    constructor(at, host, port, spawnAddress) {
        
        this.UUID = uuidv1();

        this.host = host;
        this.public = true;
        this.port = port;
        this.state = 'booting';

        this.tryingupnp = false;

        this.hostInventory = {};

        this.goal = new Vec().fromString(at);
        this.node = new Node(uuidv1(), undefined, new Address(this.host, this.port), 'alive');
        this.reg = new Registry(this.node);

        this.spawn = spawnAddress ? new Node(undefined, undefined, new Address(spawnAddress), 'pending') : undefined;
        this.events = new EventEmitter();

        var server = net.createServer((socket) => this.connection(this, socket));
        server.listen(this.port, this.host);

        this.locate();
        this.maintain();

    }

    tryUpnp() {

        if (!this.tryingupnp) {
            this.tryingupnp = true;

            this.events.emit('upnptry');
            
            this.upnpc = natUpnp.createClient();

            this.upnpc.portMapping({
              public: this.node.address.port,
              private: this.node.address.port,
              ttl: 240
            }, (err) => {
              if (err) {
                 this.events.emit('upnpfail',err);
              } else {
                 this.events.emit('upnpsuccess');
              }
              this.tryingupnp = false;
            });
        }

    }

    setState(state) {
        if (state !== this.state) {
            this.events.emit('state',this.state,state);
            this.state = state;
            if (state == "roaming") {
                this.events.emit('roaming',this.goal,this._lastLocator.vector);
            }
        }
    }

    locateInstant() {
        var closest = this.reg.closest(this.goal, 'alive');
        if (this._lastLocator && closest && closest.UUID == this._lastLocator.UUID) {
            this.node.at = this.goal;
            this.setState('arrived');
        } else if (closest) {
            this._lastLocator = closest;
            this.send(closest, new Message("locate"));
            this.setState('roaming');
        } else {
            this.node.at = this.goal;
            this.setState('offline');
        }
    }

    locate() {
        this._locator = Cron('*/5 * * * * *', () => {
            this.locateInstant();
        });
    }

    maintain() {
        this._maintainer = Cron('*/3 * * * * *', () => {

            this.reg.invalidate();

            var closest = this.reg.closest(this.goal, 'pending');
            if (closest) {
                this.send(closest, new Message("ping", this.node));
            } else if (this.spawn && this.reg.isEmpty()) {
                this.send(this.spawn, new Message("ping", this.node));
            }

        });
    }

    listening(self, err) {
        if (err && err.code === 'EADDRINUSE')
        {
            // port is currently in use
            this.events.emit('error', err);
        } else if (err) {
            this.events.emit('error', err);
            console.log('Undefined server error' + err);
        } else {
            this.events.emit('listening', self.port);
        }
    }

    connection(self, socket){
        var s = new Socket(socket);
        s.events.on("message", (msg) => {
            self.receive(this, s, msg);
        });
        s.events.on("error", (err) => this.events.emit('error', err));
    }

    send(nDest, message, callback) {

        if (!nDest) {
            this.events.emit('error', new Error("Tried to send to 'undefined'"));
            return;
        }

        this.events.emit('send', nDest,  message);

        if (message instanceof Message) {
            message = message.serialize();
        }

        message.from = this.node;

        var c = new Socket(nDest, (err, data) => {
            if (!err) {
                c.emit(message, !callback);
            } else {
                c.events.on('error',(err) => this.events.emit('error', err));
            }
            callback && callback(err, data);
        });

        c.events.on('message',(message) => this.receive(this,c,message));
        c.events.on('error',(err) => this.events.emit('error', err));

    }

    reply(client, message, callback) {

        this.events.emit('repl', new Node().resolveNode(new Address(client.remoteAddress, client.remotePort)).toString(),  message.type);

        message.from = this.node;

        client.emit(message);
    }

    broadcast(message) {
        var all = this.reg.allAt(this.node.at);
        if(this.node.at !== undefined && all.length > 0) {
            for(let n of all ) {
                this.send(new Node().resolveNode(n), new Message("broadcast",message));
            }    
            return true;
        } else {
            return false;
        }
        
    }

    receive(self, client, message) {
        this.events.emit('recv', new Node().resolveNode(new Address(client.remoteAddress, client.remotePort)).toString(),  message);

        var from;

        if (message.from) {
            from = new Node().resolveNode(message.from);
            if (from.address) {
                if (from.address.type !== "tunnel") {
                    from.address.ip = client.remoteAddress;
                }
                this.reg.update(from);
                this.locateInstant();
            }
        }

        // Add client to registry
        if (message.type === "locate") {

            this.reply(client, new Message("registry",
                this.reg.serialize()
            ) );

        } else if (message.type == "registry") {

            this.reg.batchUpdate(message.payload);

        } else if (message.type == "ping" ) {

            this.locateInstant();

            if (from.address && from.address.type != "tunnel") {
                this.send(
                    from,
                    new Message("pong", { publicIp: client.remoteAdddress }),
                    (err) => {
                        if (err) {
                            this.reply(client, new Message("pung", { publicIp: client.remoteAddress }));
                        }
                    }
                );
            } else {
                this.reply(client, new Message("pong", { publicIp: client.remoteAddress }));
            }

        } else if (message.type == "pong") {

            this.votePublicIp(message.payload.publicIp);

        } else if (message.type == "pung") {

            if (this.node.address.type == "unknown")
                this.votePublicIp(message.payload.publicIp);

            this.tryUpnp();

        } else if (message.type == "tunnel") {

            this.tunnelPublicIp(client.remoteAddress);

        } else if (message.type == "remoteip") {

            this.updateIp(message.payload.ip);

        }
    }

    votePublicIp (ip) {

        try {
            if (!ip || (ip && ipaddrJs.parse(ip).range() == 'private') || this.node.address.type == "tunnel") {
                return;
            } else if (ip && ipaddrJs.parse(ip).range() == 'private') {
                this.node.address.type = "private";
                return;
            }
        } catch (e) {
            this.events.emit('error', new Error('Invalid public ip received from remote node: ' + ip));
            return;
        }

        this.hostInventory[ip] = (this.hostInventory[ip] || 0) + 1;
        var votes = 0,
            winner = undefined;
        for(var [currentIp, currentVotes] of Object.entries(this.hostInventory)) {
            if (currentVotes > votes) {
                votes = currentVotes;
                winner = currentIp;
            }
        }

        if (winner && winner != this.node.address.ip) {
            this.host = winner;
            this.node.address.ip = winner;
            this.node.address.type = "public";
            this.events.emit('ip', winner);
        }
    }

    tunnelPublicIp (addr) {
        this.node.address.ip = addr;
        this.node.address.type = "tunnel";
        this.events.emit('ip', this.node.address.ip);
    }

}

module.exports = Decent;
