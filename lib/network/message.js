"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Message = /** @class */ (function () {
    function Message(type, payload) {
        this.type = type;
        this.payload = payload || {};
    }
    Message.prototype.serialize = function () {
        return {
            type: this.type,
            payload: this.payload,
        };
    };
    return Message;
}());
exports.default = Message;
