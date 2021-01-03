"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var socket_1 = __importDefault(require("./socket"));
var address_1 = __importDefault(require("./address"));
var peer_1 = __importDefault(require("./peer"));
var Pool = /** @class */ (function () {
    function Pool(mediator, id, registry) {
        var _this = this;
        this.id = id;
        this.connections = {};
        this.reg = registry;
        this.events = mediator;
        this.events.on('socket:incoming', function (s) { return _this.incoming(s); });
    }
    Pool.prototype.incoming = function (sIncoming) {
        var _this = this;
        var s = new socket_1.default(this.id, sIncoming);
        s.events.on('message', function (message) {
            _this.events.emit('message:incoming', message, s);
        });
        s.events.once('disconnected', function (node) {
            _this.connections[node.uuid] = undefined;
        });
    };
    Pool.prototype.send = function (peer, message, callback, noCache) {
        var _this = this;
        // Find destination
        var destination;
        if (peer instanceof address_1.default) {
            destination = new peer_1.default(peer, 'pending');
        }
        else if (peer instanceof peer_1.default) {
            if (peer.uuid)
                destination = this.reg.get(peer.uuid);
        }
        // Bail out if destination not found
        if (!destination) {
            callback && callback(new Error('Recipient not found.'), destination);
            return;
        }
        // Check if connection exists
        if (destination.uuid) {
            if (!noCache && this.connections[destination.uuid]) {
                if (this.connections[destination.uuid].send(message)) {
                    callback && callback(undefined, destination);
                    return;
                }
                else {
                    callback && callback(new Error('Unknown error'));
                }
            }
        }
        // Create connection
        if (destination.address && destination.address.ip) {
            var c_1 = new socket_1.default(this.id, destination);
            c_1.events.once('connected', function () {
                c_1.send(message);
                callback && callback(undefined, destination);
            });
            c_1.events.once('disconnected', function () {
                if (destination && destination.uuid) {
                    if (!noCache)
                        _this.connections[destination.uuid] = undefined;
                    callback && callback(new Error('Connection failed'));
                }
            });
            c_1.events.on('message', function (msg) {
                return _this.events.emit('message:incoming', msg, c_1, destination ? destination.uuid : undefined);
            });
            if (!noCache && destination.uuid)
                this.connections[destination.uuid] = c_1;
        }
    };
    Pool.prototype.reply = function (socket, message, callback) {
        try {
            socket.send(message);
            callback && callback(undefined, socket);
        }
        catch (e) {
            callback && callback(new Error('Socket not connected:' + e));
        }
    };
    return Pool;
}());
exports.default = Pool;
