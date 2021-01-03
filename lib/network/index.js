"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var peer_1 = __importDefault(require("./peer"));
var message_1 = __importDefault(require("./message"));
var registry_1 = __importDefault(require("./registry"));
var address_1 = __importDefault(require("./address"));
var pool_1 = __importDefault(require("./pool"));
var tls_1 = __importDefault(require("tls"));
var croner_1 = __importDefault(require("croner"));
var ipaddr_js_1 = __importDefault(require("ipaddr.js"));
var events_1 = __importDefault(require("events"));
var nat_upnp_1 = __importDefault(require("nat-upnp"));
var peer_2 = __importDefault(require("./peer"));
var Network = /** @class */ (function () {
    function Network(id, host, port, spawnAddress, cache) {
        var _this = this;
        this.events = new events_1.default();
        this.id = id;
        this.state = 'booting';
        this.upnp = false;
        this.tryingupnp = false;
        this.hostInventory = {};
        this.node = new peer_2.default(new address_1.default(host, port), 'alive', this.id.uuid);
        this.reg = new registry_1.default(this.events, this.node, cache);
        this.pool = new pool_1.default(this.events, this.id, this.reg);
        // Set and keep track of connectivity
        this.connectivity = 'offline';
        this.events.on('socket:incoming', function () { return (_this.connectivity = 'verified' + (_this.upnp ? ' (upnp)' : '')); });
        // Handle incoming messages
        this.events.on('message:incoming', function (message, socket) { return _this.receive(message, socket); });
        // Handle discovered nodes
        this.events.on('node:discover', function (node) { return _this.locate(node); });
        this.createServer();
        this.loop();
        // Add spawn
        if (spawnAddress) {
            this.spawn = new peer_2.default(new address_1.default(spawnAddress), 'pending');
        }
    }
    Network.prototype.createServer = function () {
        var _this = this;
        tls_1.default
            .createServer({
            key: this.id.key.private,
            cert: this.id.key.cert,
            rejectUnauthorized: false,
        }, function (socket) { return _this.events.emit('socket:incoming', socket); })
            .listen(this.node.address.port, this.node.address.ip, function (err, port) {
            return _this.events.emit('server:listening', _this.node.address);
        });
    };
    Network.prototype.tryUpnp = function () {
        var _this = this;
        if (!this.tryingupnp) {
            this.tryingupnp = true;
            this.events.emit('upnp:trying');
            this.connectivity = 'upnp-try';
            this.upnpc = nat_upnp_1.default.createClient();
            this.upnpc.portMapping({
                public: this.node.address.port,
                private: this.node.address.port,
                ttl: 240,
            }, function (err) {
                if (err) {
                    _this.events.emit('upnp:fail', err);
                    _this.connectivity = 'upnp-fail';
                }
                else {
                    _this.events.emit('upnp:success');
                    _this.connectivity = 'upnp-success';
                    _this.upnp = true;
                }
                _this.tryingupnp = false;
            });
        }
    };
    Network.prototype.setState = function (state) {
        if (state !== this.state) {
            this.events.emit('state:changed', this.state, state);
            this.state = state;
        }
    };
    Network.prototype.loop = function () {
        var _this = this;
        var _locator = croner_1.default('*/5 * * * * *', function () {
            // Make nodes pending
            _this.reg.invalidate();
            // Find and ping random pending node
            var firstPending = _this.reg.first('pending');
            if (firstPending) {
                _this.send(firstPending, new message_1.default('ping', { node: _this.node }));
                // Ping spawn if registry is empty
            }
            else if (_this.spawn) {
                _this.send(_this.spawn, new message_1.default('ping', { node: _this.node }));
            }
        });
    };
    Network.prototype.reply = function (socket, message, callback) {
        if (!socket) {
            this.events.emit('error', new Error("Tried to reply to 'undefined'"));
            return;
        }
        var messageSerialized = message.serialize();
        this.events.emit('message:reply', socket, messageSerialized);
        this.pool.reply(socket, messageSerialized, callback);
    };
    Network.prototype.send = function (dest, message, callback, noCache) {
        if (!dest) {
            this.events.emit('error', new Error("Tried to send to 'undefined'"));
            return;
        }
        var messageSerialized = message.serialize();
        this.events.emit('message:send', dest, message);
        this.pool.send(dest, message, callback, noCache);
    };
    Network.prototype.locate = function (node) {
        var _this = this;
        this.send(node, new message_1.default('locate', {}), function (err) { return err && _this.events.emit('error', new Error('Error during locate: ' + err)); }, true);
    };
    Network.prototype.broadcast = function (message) {
        var _this = this;
        var all = this.reg.all('alive');
        if (this.node !== undefined && all.length > 0) {
            for (var _i = 0, all_1 = all; _i < all_1.length; _i++) {
                var n = all_1[_i];
                this.send(n, new message_1.default('broadcast', { message: message }), function (err) { return err && _this.events.emit('error', new Error('Error during broadcast: ' + err)); });
            }
            return true;
        }
        else {
            return false;
        }
    };
    Network.prototype.receive = function (message, socket) {
        var _this = this;
        this.events.emit('message:received', message, socket);
        try {
            // Act on incoming messages
            if (message.type === 'registry') {
                // Handle incoming batch update
                if (message.payload && message.payload.registry) {
                    this.reg.batchUpdate(message.payload.registry);
                }
            }
            else if (message.type === 'locate') {
                this.reply(socket, new message_1.default('registry', { registry: this.reg.serialize() }), function (err) {
                    return _this.events.emit('error', 'Error during reply ' + err);
                });
            }
            else if (message.type === 'ping') {
                // Handle from node
                if (message.payload && message.payload.node) {
                    var resolvedNode = new peer_2.default(message.payload.node.address, 'pending', message.payload.node.status);
                    socket.setNode(resolvedNode);
                    this.reg.update(resolvedNode, socket);
                    this.reply(socket, new message_1.default('pong', { node: this.node, publicIp: socket.remoteAddress }), function (err) { return err && _this.events.emit('error', new Error('Error during reply: ')); });
                }
            }
            else if (message.type === 'pong') {
                // Handle from node
                if (message.payload && message.payload.node) {
                    var resolvedNode = new peer_1.default(message.payload.node.address, 'pending', message.payload.node.uuid);
                    socket.setNode(resolvedNode);
                    this.reg.update(resolvedNode, socket);
                }
                // Handle public ip votes
                if (message.payload && message.payload.publicIp) {
                    this.votePublicIp(message.payload.publicIp);
                }
            }
        }
        catch (e) {
            this.events.emit('error', 'Failed to receive message: ' + e);
        }
    };
    Network.prototype.votePublicIp = function (ip) {
        try {
            if (!ip || (ip && ipaddr_js_1.default.parse(ip).range() === 'private')) {
                this.node.address.type = 'private';
                return;
            }
        }
        catch (e) {
            this.events.emit('error', new Error('Invalid public ip received from remote node: ' + ip));
            return;
        }
        this.hostInventory[ip] = (this.hostInventory[ip] || 0) + 1;
        var votes = 0;
        var winner;
        for (var _i = 0, _a = Object.keys(this.hostInventory); _i < _a.length; _i++) {
            var currentIp = _a[_i];
            var currentVotes = this.hostInventory[currentIp];
            if (currentVotes && currentVotes > votes) {
                votes = currentVotes;
                winner = currentIp;
            }
        }
        if (winner && winner !== this.node.address.ip) {
            this.node.address.ip = winner;
            this.node.address.type = 'public';
            this.events.emit('ip:changed', winner);
        }
    };
    return Network;
}());
exports.default = Network;
