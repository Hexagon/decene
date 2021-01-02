var Node =          require("./node"),
    Message =       require("./message"),
    Registry =      require("./registry"),
    Address =       require("./address"),
    Pool =          require("./pool"),
    tls =           require('tls'),
    Cron =          require('croner'),
    ipaddrJs =      require('ipaddr.js'),
    EventEmitter =  require('events'),
    natUpnp =       require('nat-upnp');

class Decent {

    constructor(id, host, port, spawnAddress, cache) {

        this.events = new EventEmitter();

        this.id = id;

        this.state = 'booting';
        this.upnp = false;

        this.tryingupnp = false;

        this.hostInventory = {};

        this.node = new Node(this.id.uuid, new Address(host, port), 'alive');

        this.reg = new Registry(this.events, this.node, cache);
        
        this.pool = new Pool(this.events, this.id, this.reg);

        // Set and keep track of connectivity
        this.connectivity = 'offline';
        this.events.on('socket:incoming', () => this.connectivity = 'verified' + (this.upnp ? ' (upnp)' : ''));

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
            .createServer({
                key: this.id.key.private,
                cert: this.id.key.cert,
                rejectUnauthorized: false
            }, (socket) => this.events.emit('socket:incoming', socket))
            .listen(this.node.address.port, this.node.address.ip, (err, port) => this.events.emit('server:listening', this.node.address ));
    }

    tryUpnp() {

        if (!this.tryingupnp) {
            this.tryingupnp = true;

            this.events.emit('upnp:trying');
            this.connectivity = 'upnp-try';
            
            this.upnpc = natUpnp.createClient();

            this.upnpc.portMapping({
                public: this.node.address.port,
                private: this.node.address.port,
                ttl: 240
            }, (err) => {
              if (err) {
                 this.events.emit('upnp:fail',err);
                 this.connectivity = 'upnp-fail';
              } else {
                 this.events.emit('upnp:success');
                 this.connectivity = 'upnp-success';
                 this.upnp = true;
              }
              this.tryingupnp = false;
            });
        }

    }

    setState(state) {
        if (state !== this.state) {
            this.events.emit('state:changed',this.state,state);
            this.state = state;
        }
    }

    loop() {
        this._locator = Cron('*/5 * * * * *', () => {

            // Make nodes pending
            this.reg.invalidate();
            
            // Find and ping random pending node
            var firstPending = this.reg.first('pending');
            if (firstPending) {
                this.send(firstPending.uuid, new Message("ping", {node: this.node }));

            // Ping spawn if registry is empty
            } else if (this.spawn) {
                this.send(this.spawn, new Message("ping", {node: this.node }));

            }

        });
    }

    reply(socket, message, callback, noCache) {

        if (!socket) {
            this.events.emit('error', new Error("Tried to reply to 'undefined'"));
            return;
        }

        if (message instanceof Message) {
            message = message.serialize();
        }

        this.events.emit('message:reply', socket,  message);
        this.pool.reply(socket, message, callback, noCache);

    }

    send(dest, message, callback, noCache) {

        if (!dest) {
            this.events.emit('error', new Error("Tried to send to 'undefined'"));
            return;
        }

        if (message instanceof Message) {
            message = message.serialize();
        }

        this.events.emit('message:send', dest,  message);
        this.pool.send(dest, message, callback, noCache);

    }

    locate(node) {
        this.send(node.uuid,
            new Message("locate", {}),
            (err) => err && this.events.emit('error', new Error("Error during locate: " + err)),
            true
        );
    }

    broadcast(message) {
        var all = this.reg.all('alive');
        if(this.node !== undefined && all.length > 0) {
            for(let n of all ) {
                this.send(n.uuid, new Message("broadcast",{ message: message }),
                (err) => err && this.events.emit('error', new Error("Error during broadcast: " + err)));
            }    
            return true;
        } else {
            return false;
        }
        
    }

    receive(message, socket) {

        this.events.emit('message:received', message, socket);

        try {
        // Act on incoming messages
        if (message.type === "registry") {
            // Handle incoming batch update
            if (message.payload && message.payload.registry) {
                this.reg.batchUpdate(message.payload.registry);
            }
        } else if (message.type === "locate") {
            this.reply(socket, new Message("registry",
                { registry: this.reg.serialize() }
            ), 
            (err) => this.events.emit('error', 'Error during reply ' + err) );
        } else if (message.type === "ping" ) {
            
            // Handle from node
            if (message.payload && message.payload.node) {
                let resolvedNode = new Node().resolveNode(message.payload.node)
                socket.setNode(resolvedNode);
                this.reg.update(resolvedNode, socket);
                
                this.reply(socket,
                    new Message("pong", { node: this.node, publicIp: socket.remoteAddress }),
                    (err) => err && this.events.emit('error', new Error("Error during reply: ")),
                    true
                );
            }
        } else if (message.type == "pong") {
            // Handle from node
            if (message.payload && message.payload.node) {
                let resolvedNode = new Node().resolveNode(message.payload.node)
                socket.setNode(resolvedNode);
                this.reg.update(resolvedNode, socket);
            }
            // Handle public ip votes            
            if (message.payload && message.payload.publicIp) {
                this.votePublicIp(message.payload.publicIp);
            }
        }/* else if (message.type == "pung") {
            this.tryUpnp();
        }*/
    } catch(e) {
    }
    }

    votePublicIp (ip) {

        try {
            if (!ip || (ip && ipaddrJs.parse(ip).range() == 'private')) {
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
            this.node.address.ip = winner;
            this.node.address.type = "public";
            this.events.emit('ip:changed', winner);
        }

    }

}

module.exports = Decent;
