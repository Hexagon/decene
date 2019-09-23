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

        socket.setTimeout(10000);

        this.socket = socket;
        this.callback = callback;

        this.remoteAddress = socket.localAddress;
        this.remotePort = socket.localPort;

        setTimeout(function(){
          var isdestroyed = socket.destroyed;
          console.log('Socket destroyed:' + isdestroyed);
          socket.destroy();
        }, 1200000);

    }

    connect(node, callback) {

        //console.log('Initiating connecting with' , this.node.toString());

        var client  = new net.Socket();
        client.connect({
            host: node.address.ip,
            port: node.address.port
        });

        this.remoteAddress = node.address.ip;
        this.remotePort = node.address.port;
        this.node = node;
        
        client.on('connect', () => {
            this.remoteAddress = client.localAddress;
            this.node.address.ip = client.localAddress;
            callback(undefined,this.socket)
        });

        setTimeout(function(){
          client.end('Bye bye server');
        },5000);

        this.socket = client;

    }

    emit(data) {
      var is_kernel_buffer_full = this.socket.write(JSON.stringify(data));
      if(is_kernel_buffer_full){

      }else{
        this.socket.pause();
      }
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
        console.log('Client disconnect.');
    }

        // When client timeout.
    timeout() {
        console.log('Client request time out. ');
    }
}

module.exports = Socket;