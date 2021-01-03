"use strict";
var Address = require("./address.js");
var Node = /** @class */ (function () {
    function Node(uuid, addr, status) {
        this.uuid = uuid;
        this.address = addr;
        this.status = status;
        this.lastUpdate = undefined;
    }
    Node.prototype.resolveNode = function (inData) {
        if (inData instanceof Node) {
            this.uuid = inData.uuid;
            this.address = inData.address;
            this.status = inData.status;
            this.lastUpdate = inData.lastUpdate;
        }
        else if (inData instanceof Address) {
            this.address = inData;
        }
        else {
            if (inData && inData.address) {
                this.address = new Address(inData.address.ip, inData.address.port, inData.address.type);
            }
            if (inData && inData.uuid) {
                this.uuid = inData.uuid;
            }
            if (inData && inData.status) {
                this.status = inData.status;
            }
            if (inData && inData.lastUpdate) {
                this.lastUpdate = inData.lastUpdate;
            }
        }
        return this;
    };
    Node.prototype.toString = function () {
        if (this.address && this.at) {
            return this.at.toString() + "@" + this.address.ip + ":" + this.address.port;
        }
        else if (this.address) {
            return this.at + "@" + this.address.ip + ":" + this.address.port;
        }
        else if (this.at) {
            return this.at.toString();
        }
    };
    Node.prototype.flagUpdated = function () {
        this.lastUpdate = Date.now();
    };
    Node.prototype.invalidate = function () {
        this.status = 'pending';
    };
    return Node;
}());
module.exports = Node;
