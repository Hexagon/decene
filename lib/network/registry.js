"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var address_js_1 = __importDefault(require("./address.js"));
var peer_js_1 = __importDefault(require("./peer.js"));
var Registry = /** @class */ (function () {
    function Registry(mediator, self, cache) {
        this.node = self;
        this.r = {};
        this.events = mediator;
        if (cache) {
            this.batchUpdate(cache);
        }
    }
    Registry.prototype.get = function (uuid) {
        return this.r[uuid];
    };
    Registry.prototype.first = function (status) {
        var result = [];
        for (var _i = 0, _a = Object.keys(this.r); _i < _a.length; _i++) {
            var currIndex = _a[_i];
            var currNode = this.r[currIndex];
            if (currNode && (!status || currNode.status === status)) {
                return currNode;
            }
        }
    };
    Registry.prototype.all = function (status) {
        var result = [];
        for (var _i = 0, _a = Object.keys(this.r); _i < _a.length; _i++) {
            var currIndex = _a[_i];
            var currNode = this.r[currIndex];
            if (currNode && (!status || currNode.status === status)) {
                result.push(currNode);
            }
        }
        return result;
    };
    Registry.prototype.count = function (status) {
        var result = [];
        for (var _i = 0, _a = Object.keys(this.r); _i < _a.length; _i++) {
            var currIndex = _a[_i];
            var currNode = this.r[currIndex];
            if (!status || currNode.status === status) {
                result.push(currNode);
            }
        }
        return result.length;
    };
    Registry.prototype.invalidate = function () {
        for (var _i = 0, _a = Object.keys(this.r); _i < _a.length; _i++) {
            var currIndex = _a[_i];
            var currNode = this.r[currIndex];
            if (currNode.lastUpdate && Date.now() - currNode.lastUpdate > 24 * 60 * 60 * 1000) {
                this.events.emit('node:dead', currNode);
                this.r[currIndex] = undefined;
            }
            else if (currNode.lastUpdate && Date.now() - currNode.lastUpdate > 30000) {
                this.events.emit('node:invalidate', currNode);
                currNode.invalidate();
            }
        }
    };
    Registry.prototype.update = function (n, socket) {
        var resolved = new peer_js_1.default(n.address, n.status, n.uuid);
        if (resolved && resolved.uuid !== this.node.uuid) {
            if (socket && socket.remoteAddress) {
                resolved.address = new address_js_1.default(socket.remoteAddress, resolved.address ? resolved.address.port : 0);
            }
            if (resolved.uuid && !this.r[resolved.uuid] && n.uuid) {
                this.r[n.uuid] = resolved;
                this.events.emit('node:discover', resolved);
            }
            else if (n.uuid) {
                this.r[n.uuid] = resolved;
                this.events.emit('node:update', resolved);
            }
            resolved.flagUpdated();
        }
    };
    Registry.prototype.batchUpdate = function (r) {
        // Only import alive nodes
        // change all to pending on import
        for (var _i = 0, _a = Object.keys(r); _i < _a.length; _i++) {
            var currIndex = _a[_i];
            var n = r[currIndex];
            if (n && n.status === 'alive') {
                if (n.uuid && !this.r[n.uuid]) {
                    n.status = 'pending';
                }
                else if (n.uuid) {
                    n.status = this.r[n.uuid].status;
                    n.lastUpdate = Math.max(this.r[n.uuid].lastUpdate, this.r[n.uuid].lastUpdate);
                }
                this.update(n);
            }
        }
        this.events.emit('registry:batch');
    };
    Registry.prototype.serialize = function () {
        return this.r;
    };
    Registry.prototype.isEmpty = function () {
        return !Object.values(this.r).length;
    };
    return Registry;
}());
exports.default = Registry;
