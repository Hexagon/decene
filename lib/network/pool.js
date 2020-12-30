var
    Socket = require("./socket.js"),
    Address = require("./address.js"),
    Node = require("./node.js");

class Pool {

	constructor(mediator, id, registry) {
		this.id = id;
		this.connections = {};
		this.reg = registry;
		this.events = mediator;

        this.events.on('socket:incoming', (s) => this.incoming(s));
	}

	incoming(sIncoming) {
	    var s = new Socket(this.id, sIncoming);
        s.events.on("message", (message) => {
			this.events.emit('message:incoming', message, s );
        });
        s.events.once('disconnected', () => {
            this.connections[uuid] = undefined;
        });
	}
	
	send(uuid, message, callback, noCache = false) {

		// Find destination
		var destination;
		if (uuid instanceof Address) {
			destination = new Node(undefined, uuid, 'pending');
		} else {
			destination = this.reg.get(uuid);
		}

		// Bail out if destination not found
		if (!destination) {
			callback && callback(new Error("Recipient not found."), destination);
			return;
		}

		// Check if connection exists
		if (!noCache && this.connections[uuid]) {
			if(this.connections[uuid].send(message)) {
				callback && callback(undefined, destination);
				return;
			} else {
				callback && callback(new Error("Unknown error"));
			}
		}

		// Create connection
		if (destination.address && destination.address.ip) {
			var c = new Socket(this.id, destination);
	        c.events.once('connected', () => {
	            c.send(message);
	            callback && callback(undefined, destination);
	        });
	        c.events.once('disconnected', () => {
	            if (!noCache) this.connections[uuid] = undefined;
	            callback && callback(new Error("Connection failed", destination));
	        });
	        c.events.on('message',(message) => this.events.emit('message:incoming', message, c));

	        if (!noCache) this.connections[uuid] = c; 
	    }

	}

	reply(socket, message, callback) {
		if (socket.connected) {
			socket.send(message);
			callback && callback(undefined, destination);	
		} else {
			callback && callback(new Error("Socket not connected"));
		}
		
	}
}

module.exports = Pool;