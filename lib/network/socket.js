var 
    net = require('net'),
    tls = require('tls'),

    EventEmitter = require('events'),
    Node = require("./node.js");

class Socket {
    constructor(id, remote, callback) {

        this.buffer = "";
        this.events = new EventEmitter();
        this.used = false;
        this.id = id;
        this.separator = "<EOM\0",     
        this.altSeparator = "<EOM\t\0";
        this.maxBuffer = 15*1024*1024;

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

        // Stringify data
        var prepData = JSON.stringify(data);

        // Make sure that data never contains separator
        if (prepData.indexOf(this.separator) != -1) {
            prepData.replace(this.separator, this.altSeparator);
        }

        prepData += this.separator;

        this.used = true;

        if (this.socket.readyState !== 'closed') {
            var is_kernel_buffer_full = this.socket.write(prepData);
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
    data(parent, data) {
        
        var sPos;

        this.used = true;

        this.buffer += data;

        // Silently prevent buffer overflow
        if (this.buffer.length > this.maxBuffer) {
            this.buffer = this.buffer.slice(this.buffer.length-this.maxBuffer,this.buffer.length);
        }

        while((sPos = this.buffer.indexOf(this.separator)) !== -1) {

            var message = this.buffer.slice(0,sPos);
            this.buffer = this.buffer.slice(sPos+this.separator.length, this.buffer.length);

            if (message.indexOf(this.altSeparator) !== -1) {
                    message.replace(this.altSeparator, this.separator);
            }

            try {
                message = JSON.parse(message);
            } catch (ex) {
                
            }

            if (message) {
                this.events.emit("message", message);
            }

        }


    }

}

module.exports = Socket;