var Node = require("./node.js"),
    Message = require("./message.js"),
    Registry = require("./registry.js"),
    Address = require("./address.js"),
    Vec = require("./vec.js"),
    Pool = require("./pool.js"),

    net = require('net'),
    tls = require('tls'),


    Cron = require('croner'),
    uuidv1 = require('uuid/v1'),

    ipaddrJs = require('ipaddr.js'),
    //bonjour = require('bonjour')(({multicast: true, ttl: 255})),

    EventEmitter = require('events');

var natUpnp = require('nat-upnp');

class Decent {

    constructor(id, at, host, port, spawnAddress, cache) {

        this.id = id;

        this.host = host;
        this.public = true;
        this.port = port;
        this.state = 'booting';
        this.connectivity = 'offline';
        this.upnp = false;

        this.tryingupnp = false;

        this.hostInventory = {};

        this.goal = new Vec().fromString(at);
        this.node = new Node(this.id.uuid, undefined, new Address(this.host, this.port), 'alive');
        this.reg = new Registry(this.node, cache);

        this.pool = new Pool(this.id, this.reg);
        this.pool.events.on('incoming', (message, socket) => this.receive(message, socket));

        this.spawn = spawnAddress ? new Address(spawnAddress) : undefined;
        this.events = new EventEmitter();

        var server = tls.createServer({key: this.id.key.private, cert: this.id.key.cert, rejectUnauthorized: false}, (socket) => {
            this.connection(this, socket)
        });
        server.listen(this.port, this.host, (err, port) => {
            this.listening(server.address)
        });

        this.loop();

    }

    tryUpnp() {

        if (!this.tryingupnp) {
            this.tryingupnp = true;

            this.events.emit('upnptry');
            this.connectivity = 'upnp-try';
            
            this.upnpc = natUpnp.createClient();

            this.upnpc.portMapping({
              public: this.node.address.port,
              private: this.node.address.port,
              ttl: 240
            }, (err) => {
              if (err) {
                 this.events.emit('upnpfail',err);
                 this.connectivity = 'upnp-fail';
              } else {
                 this.events.emit('upnpsuccess');
                 this.connectivity = 'upnp-success';
                 this.upnp = true;
              }
              this.tryingupnp = false;
            });
        }

    }

    setState(state) {
        if (state !== this.state) {
            this.state = state;
            this.events.emit('state',this.state,state);
            if (state == "roaming") {
                this.events.emit('roaming',this.goal,this._lastLocator.at);
            }
        }
    }

    locate() {

        var closestAlive = this.reg.closest(this.goal, 'alive');

        if (!closestAlive) {
            this.node.at = this.goal;
            this.setState('offline');
            return;
        }
        var allAtClosest = this.reg.allAt(closestAlive.at, 'alive');

        var randomAlive = allAtClosest[Math.floor(Math.random() * allAtClosest.length)];

        // There is alive nodes nearby
        if (randomAlive) {

            // If we find no closer nodes, or have arrived
            if((this._lastLocator && this._lastLocator.UUID == randomAlive.UUID) || this.goal.eq(randomAlive.at)) {
                this.node.at = this.goal;
                this._lastLocator = randomAlive;
                this.setState('arrived');

            // Else we are roaming
            } else {
                this.node.at = randomAlive.at;
                this._lastLocator = randomAlive;
                this.setState('roaming');
            }
            this.send(randomAlive.uuid, new Message("locate", {}));

        // No close 
        } else {
            this.node.at = this.goal;
            this.setState('offline');

        }

    }

    loop() {
        this._locator = Cron('*/5 * * * * *', () => {

            // Make nodes pending
            this.reg.invalidate();
            var closestPending = this.reg.closest(this.goal, 'pending');

            // Ping closest pending node
            if (closestPending) {
                this.send(closestPending.uuid, new Message("ping", {node: this.node }));

            // Ping spawn if registry is empty
            } else if (this.spawn && this.reg.isEmpty()) {
                this.send(this.spawn, new Message("ping", {node: this.node }));

            }
            if (this.state != 'arrived') {
                this.locate();
            }

        });
        this._maintainer = Cron('*/30 * * * * *', () => {
            if (this.state == 'arrived') {
                this.locate();
            }
        });
    }

    listening(self, err) {
        this.events.emit('listening', self.port);

        this.advertiseLan();
        this.scanLan();
    }

    advertiseLan() {
        //bonjour.publish({ name: 'Decent Node', type: 'decent', port: this.node.address.port });
    }

    scanLan() {
        //this._scanner = Cron('*/15 * * * * *', () => {
        //    // browse for all http services
        //    bonjour.find({ type: 'decent' }, (service) => {
        //      this.events.emit('bonjour', service);
        //    }
        //    );
        //});
    }

    connection(self, socket){
        this.connectivity = 'verified' + (this.upnp ? ' (upnp)' : '');
        this.pool.incoming(socket);
    }

    send(dest, message, callback, noCache) {

        if (!dest) {
            this.events.emit('error', new Error("Tried to send to 'undefined'"));
            return;
        }

        if (message instanceof Message) {
            message = message.serialize();
        }

        var deststring = dest instanceof Address ? dest : dest.substr(dest.length - 12);

        this.events.emit('send', deststring,  message);
        this.pool.send(dest, message, callback, noCache);

    }

    broadcast(message) {
        var all = this.reg.allAt(this.node.at, 'alive');
        if(this.node.at !== undefined && all.length > 0) {
            for(let n of all ) {
                this.send(n.uuid, new Message("broadcast",{ message: message }));
            }    
            return true;
        } else {
            return false;
        }
        
    }

    receive(message, socket) {

        this.events.emit('recv', message);

        // Add client to registry
        if (message.type === "locate") {

            this.send(message.from, new Message("registry",
                { registry: this.reg.serialize() }
            ) );

        } else if (message.type == "registry") {

            if (message.payload && message.payload.registry) {
                this.reg.batchUpdate(message.payload.registry);
            }

        } else if (message.type == "ping" ) {

            if (message.payload && message.payload.node) {
                this.reg.update(new Node().resolveNode(message.payload.node), socket);
            }
            
            if (message.payload && message.payload.publicIp) {
                this.votePublicIp(message.payload.publicIp);
            }

            this.send(message.from,
                new Message("pong", { node: this.node }),
                (err) => {
                    if (err) {
                        this.send(message.from,
                            new Message("pung", { node: this.node })
                        );
                    }
                },
                true
            );

        } else if (message.type == "pong") {
            
            if (message.payload && message.payload.node) {
                this.reg.update(new Node().resolveNode(message.payload.node), socket);
            }
            
            if (message.payload && message.payload.publicIp) {
                this.votePublicIp(message.payload.publicIp);
            }


        } else if (message.type == "pung") {

            /*if (this.node.address.type == "unknown")
                this.votePublicIp(message.payload.publicIp);*/

            this.tryUpnp();

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
