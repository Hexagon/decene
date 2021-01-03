"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var peer_1 = __importDefault(require("./peer"));
var tls_1 = __importDefault(require("tls"));
var events_1 = __importDefault(require("events"));
var Socket = /** @class */ (function () {
    function Socket(id, remote, callback) {
        this.buffer = '';
        this.events = new events_1.default();
        this.used = false;
        this.id = id;
        this.header = 'DEC-BOM>';
        this.separator = '<DEC-EOM\0';
        this.altSeparator = '<DEC-EOM-ALT>\t\0';
        this.maxBuffer = 15 * 1024 * 1024;
        this.reconnects = 5;
        if (remote instanceof peer_1.default) {
            this.connect(remote);
        }
        else {
            this.incoming(remote);
        }
        if (this.socket)
            this.socket.setEncoding('utf8');
    }
    Socket.prototype.incoming = function (socket) {
        var _this = this;
        socket.setTimeout(3600 * 1000);
        this.socket = socket;
        this.remoteAddress = socket.remoteAddress;
        this.socket.on('data', function (data) { return _this.data(_this, data); });
        this.socket.on('drain', function () { return _this.drain; });
        this.socket.on('timeout', function () { return _this.events.emit('timeout'); });
        this.socket.on('end', function () { return _this.events.emit('end'); });
        this.socket.on('error', function (error) {
            if (_this.socket)
                _this.socket.end();
        });
        this.socket.on('close', function (error) { return _this.events.emit('close', error); });
    };
    Socket.prototype.setNode = function (node) {
        this.node = this.node || node;
    };
    Socket.prototype.connect = function (node) {
        var _this = this;
        if (this.reconnects <= 0) {
            this.events.emit('disconnected');
            return;
        }
        else {
            this.reconnects -= 1;
        }
        this.node = this.node || node;
        if (this.node) {
            this.remotePort = this.node.address.port;
            this.socket = tls_1.default.connect({
                host: this.node.address.ip,
                port: this.node.address.port,
                ca: this.id.key.cert,
                rejectUnauthorized: false,
            });
            this.socket.on('data', function (data) { return _this.data(_this, data); });
            this.socket.on('drain', function () { return _this.drain; });
            this.socket.on('error', function (error) {
                _this.events.emit('error', error);
                if (_this.socket)
                    _this.socket.end();
            });
            this.socket.on('timeout', function (err) {
                if (_this.socket)
                    _this.socket.end();
            });
            this.socket.on('close', function (err) {
                if (_this.timeout)
                    clearTimeout(_this.timeout);
                setTimeout(function () { return _this.connect(); }, 1000);
                _this.events.emit('reconnecting', err);
            });
            this.socket.on('connect', function () {
                if (_this.timeout)
                    clearTimeout(_this.timeout);
                if (_this.socket && _this.node) {
                    _this.reconnects = 5;
                    _this.remoteAddress = _this.socket.remoteAddress;
                    _this.remotePort = _this.node.address.port;
                    _this.events.emit('connected');
                }
            });
            this.timeout = setTimeout(function () {
                if (_this.socket) {
                    _this.socket.end();
                    setTimeout(function () { return _this.connect(); }, 1000);
                    _this.events.emit('reconnecting', new Error('Timeout'));
                }
            }, 1000);
        }
    };
    Socket.prototype.send = function (data, close) {
        // Stringify data
        var prepData = JSON.stringify(data);
        // Make sure that data never contains separator
        if (prepData.indexOf(this.separator) !== -1) {
            prepData.replace(this.separator, this.altSeparator);
        }
        prepData = this.header + prepData + this.separator;
        this.used = true;
        if (this.socket) {
            var isKernelBufferFull = this.socket.write(prepData);
            if (isKernelBufferFull) {
                if (close) {
                    this.end();
                }
            }
            else {
                this.socket.pause();
            }
            return true;
        }
        else {
            return false;
        }
    };
    Socket.prototype.end = function () {
        if (this.socket)
            this.socket.end();
        this.events.emit('disconnected', this.node);
    };
    Socket.prototype.drain = function () {
        if (this.socket)
            this.socket.resume();
    };
    // When receive client data.
    Socket.prototype.data = function (_, data) {
        this.used = true;
        this.buffer += data;
        // Silently prevent buffer overflow
        if (this.buffer.length > this.maxBuffer) {
            this.buffer = this.buffer.slice(this.buffer.length - this.maxBuffer, this.buffer.length);
        }
        while (this.buffer.indexOf(this.separator) !== -1) {
            var sPos = this.buffer.indexOf(this.separator);
            // Extract and remove message from buffer
            var message = this.buffer.slice(0, sPos);
            var hPos = message.indexOf(this.header);
            this.buffer = this.buffer.slice(sPos + this.separator.length, this.buffer.length);
            // Find header
            if (hPos === -1) {
                // No header == throw message
            }
            else {
                // Header verified, throw away
                message = message.slice(hPos + this.header.length, message.length);
                if (message.indexOf(this.altSeparator) !== -1) {
                    message.replace(this.altSeparator, this.separator);
                }
                try {
                    message = JSON.parse(message);
                    this.events.emit('message', message);
                }
                catch (ex) {
                    this.events.emit('error', ex);
                }
            }
        }
    };
    return Socket;
}());
exports.default = Socket;
