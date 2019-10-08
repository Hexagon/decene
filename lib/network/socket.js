var 
    net = require('net'),
    tls = require('tls'),

    EventEmitter = require('events'),
    Node = require("./node.js");

class Socket {
    constructor(mediator, id, remote, callback) {

        this.buffer = "";
        this.events = mediator;
        this.used = false;
        this.id = id;

        this.reconnects = 5;

        if (remote instanceof Node) {
            this.connect(remote, callback);
        } else {
            this.incoming(remote, callback);
        }

        this.socket.setEncoding('utf8');


    }

    incoming(socket) {

        socket.setTimeout(3600*1000);

        this.socket = socket;
        
        this.remoteAddress = socket.remoteAddress;

        this.socket.on('data', (data) => this.data(this, data));
        this.socket.on('drain', () => this.drain);
        this.socket.on('timeout', () => this.events.emit('timeout'));
        this.socket.on('end', () => this.events.emit('end'));
        this.socket.on('error', (error) => {
            this.socket.end();
        });
        this.socket.on('close', (error) => this.events.emit('close', error));

    }

    connect(node) {

        if (this.reconnects <= 0) {
            this.events.emit('disconnected');
            if (this.used == false) {
            }
            return;
        } else {
            this.reconnects -= 1;
        }

        this.node = this.node || node;
        this.remotePort = this.node.address.port;

        this.socket = tls.connect({
            host: this.node.address.ip,
            port: this.node.address.port,
            ca: this.id.key.cert,
            rejectUnauthorized: false
        });

        this.socket.on('data', (data) => this.data(this, data));
        this.socket.on('drain', () => this.drain);

        this.socket.on('error', (error) => {
            //this.events.emit('error', error);
            this.socket.end();
        });

        this.socket.on('timeout', (err) => {
            this.socket.end();
        });

        this.socket.on('close', (err) => {
            clearTimeout(this.timeout);
            setTimeout(()=> this.connect(),1000);
            this.events.emit('reconnecting',err);
        });

        this.socket.on('connect', () => {
            clearTimeout(this.timeout);
            this.reconnects = 5;
            this.remoteAddress = this.socket.remoteAddress;
            this.remotePort = this.node.address.port;
            this.events.emit('connected');
        });

        this.timeout = setTimeout(() => {
          this.socket.end();
          setTimeout(()=> this.connect(),1000);
          this.events.emit('reconnecting',new Error("Timeout"));
        },1000);

    }

    send(data, close) {
        this.used = true;
        if (this.socket.readyState !== 'closed') {
            var is_kernel_buffer_full = this.socket.write(JSON.stringify(data));
            if(is_kernel_buffer_full){
                if (close) {
                    this.end();
                }
            }else{
                this.socket.pause();
            }
            return true;
        } else {
            return false;
        }
    }

    end() {
        this.socket.end();
        this.emit("disconnected");
    }

    drain() {
        this.socket.resume();
    }

    // When receive client data.
    data(self, data) {
        
        this.used = true;

        var message;

        this.buffer += data;

        try {
            message = JSON.parse(self.buffer);
        } catch (ex) {
            ;
        }

        if (message) {
            self.events.emit("message", message);
            self.buffer = "";
        }

    }

}

module.exports = Socket;