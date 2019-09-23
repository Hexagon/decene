var Node = require("./node.js"),
    Message = require("./message.js"),
    Registry = require("./registry.js"),
    Address = require("./address.js"),
    Vec = require("./vec.js"),
    Socket = require("./socket.js"),

    net = require('net'),

    Cron = require('croner'),
    uuidv1 = require('uuid/v1');

const 
    EventEmitter = require('events');

class Decent {

    constructor(regSize, retries, at, uPnp = false, fixedPort = false, fixedAddress = false, spawnAddress, spawnPort) {
        
        this.UUID = uuidv1();
        this.reg = new Registry(regSize);
        this.retries = retries;
        this.uplink;/* HOW? establish fixed uplink, establish uPnp uplink, establish tunneled uplink */
        this.host = '0.0.0.0';
        this.public = true;
        this.port = 47474;
        this.fixedPort = false;
        this.state = 'booting';

        this.goal = new Vec().fromString(at);
        this.node = new Node(uuidv1(), undefined, new Address(this.host, this.port), 'alive');

        this.spawn = spawnAddress ? new Node(undefined, undefined, new Address(spawnAddress, spawnPort), 'pending') : undefined;

        this._events = new EventEmitter();

        if (fixedPort) this.port = fixedPort;
        if (fixedAddress) this.host = fixedAddress;

        console.log('Node navigating to vector ['+ this.goal.toString() + '] is starting up.');
        console.log('Node listening on ' + this.host + ":" + this.port);

        var server = net.createServer((socket) => this.connection(this, socket));
        server.listen(this.port, this.host);

        if (this.spawn) {
            this.send(this.spawn, new Message("ping", this.node ));
        }


    }

    setState(state) {
        if (state !== this.state) {
            console.log('State changed from ' + this.state + ' to ' + state);
            this.state = state;
            if (state == "roaming") {
                console.log('Roaming for '+this.goal+', current location ' + this._lastLocator.vector)
            }
        }
    }
    locateInstant() {
        var closest = this.reg.closest(this.goal);
        if (this._lastLocator && closest.UUID == this._lastLocator.UUID) {
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
        this._locator = Cron('* * * * * *', () => {
            this.locateInstant();
        });
    }

    /*pending() {
        var self = this;
        this._pending = Cron('* * * * * *', function () {
            var pending = self.reg.pending();
            if (pending) {
                console.log('Pending node found, contacting');
                self.send(pending, new Message("ping"));
            }
        });
    }*/


    listening(self, err) {
        if (err && err.code === 'EADDRINUSE')
        {
            // port is currently in use
            console.log('Port already in use:' + self.port);
        } else if (err) {
            console.log('Undefined server error' + err);
        } else {
            console.log('Listening on', self.port)
        }
    }

    connection(self, socket){
        var s = new Socket(socket);
        s.events.on("message", (msg) => {
            self.receive(this, s, msg);
        });
    }

    send(nDest, message, callback) {

        console.log("SEND > ", nDest.toString(),  message.type);

        if (message instanceof Message) {
            message = message.serialize();
        }

        message.from = this.node;

        var c = new Socket(nDest, (err, data) => {
            if (err) {
                console.log('Connection error:');
            } else {
                c.emit(message);
            }
        });

        c.events.on('message',(payload) => this.receive(this,c,payload));

    }

    reply(client, message, callback) {

        console.log("REPL > ", new Node().resolveNode(new Address(client.remoteAddress, client.remotePort)).toString(),  message.type);

        message.from = this.node;

        client.emit(message);
    }

    receive(self, client, message) {

        console.log('RECV < ', new Node().resolveNode(new Address(client.remoteAddress, client.remotePort)).toString(), message.type);
        
        if (message.from) {
            var node = new Node().resolveNode(message.from);
            node.address.ip = client.remoteAddress;
            this.reg.update(node);

            this.locateInstant();
        }

        // Add client to registry
        if (message.type === "locate") {

            this.reply(client, new Message("registry",
                this.reg.serialize()
            ) );

        } else if (message.type == "registry") {

            this.reg.batchUpdate(message.payload);

        } else if (["ping","pong"].includes(message.type) ) {
            
            this.locateInstant();

            if (message.type == "ping")
                this.reply(client, new Message("pong",this.node));

        } else if (message.type == "remoteip") {

            this.updateIp(message.payload.ip);

        }
    }

}

module.exports = Decent;