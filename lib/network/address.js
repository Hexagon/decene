"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Address = /** @class */ (function () {
    function Address(ip, port, type) {
        this.ip = ip;
        this.port = port;
        this.type = type || 'unknown';
        // Make port
        if (ip && ip.indexOf && ip.indexOf(':') > 0) {
            var sArr = ip.split(':');
            if (sArr.length === 2 && !isNaN(parseInt(sArr[1], 10))) {
                this.ip = sArr[0];
                this.port = parseInt(sArr[1], 10);
            }
        }
    }
    Address.prototype.toString = function () {
        return this.ip + ':' + this.port;
    };
    return Address;
}());
exports.default = Address;
