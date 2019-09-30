var 
    net = require('net'),

    EventEmitter = require('events'),
    Node = require("./node.js");

class Socket {
    constructor(remote, callback) {

        this.buffer = "";
        this.events = new EventEmitter();

        if (remote instanceof Node) {
            this.connect(remote, callback);
        } else {
            this.incoming(remote, callback);
        }

        this.socket.setEncoding('utf8');

        this.socket.on('data', (data) => this.data(this, data));
        this.socket.on('drain', () => this.drain);
        this.socket.on('timeout', () => this.events.emit('timeout'));
        this.socket.on('end', () => this.events.emit('end'));
        this.socket.on('error', (error) => this.events.emit('error', error));
        this.socket.on('close', (error) => this.events.emit('close', error));

    }

    incoming(socket, callback) {

        socket.setTimeout(1200*1000);

        this.socket = socket;
        this.callback = callback;

        this.remoteAddress = socket.remoteAddress;

        this.timeout = setTimeout(function(){
          var isdestroyed = socket.destroyed;
          socket.destroy();
        }, 1200000);

    }

    connect(node, callback) {

        var client  = new net.Socket();

        this.timeout = setTimeout(function(){
          callback(new Error("Connect timeout"));
          client.end();
        },5000);

        try {
            client.connect({
                host: node.address.ip,
                port: node.address.port
            });
        } catch (e) {
            callback(e);
        }
        this.remoteAddress = node.address.ip;
        this.remotePort = node.address.port;
        this.node = node;
        
        client.on('connect', () => {
            clearTimeout(this.timeout);
            callback(undefined,this.socket);
        });

        client.on('error', (err) => {
            clearTimeout(this.timeout);
            callback(err);
            client.end();
        });

        this.socket = client;

    }

    end() {
        this.socket.end();
    }

    emit(data, close) {
      //if (this.socket.readyState !== 'closed') {
        var is_kernel_buffer_full = this.socket.write(JSON.stringify(data));
        if(is_kernel_buffer_full){
            //if (close) {
            // this.socket.end();
            //}
        }else{
         this.socket.pause();
        }
      //}
    }

    drain() {
        this.socket.resume();
    }

    // When receive client data.
    data(self, data) {
        
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

    // When client send data complete.
    end() {
    }

        // When client timeout.
    timeout() {
    }
}

module.exports = Socket;