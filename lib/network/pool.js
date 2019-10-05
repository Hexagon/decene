var
    EventEmitter = require('events'),
    Socket = require("./socket.js"),
    Address = require("./address.js"),
    Node = require("./node.js");

class Pool {

	constructor(id, registry) {
		this.id = id;
		this.connections = {};
		this.reg = registry;
		this.events = new EventEmitter();
	}

	incoming(sIncoming) {
	    var s = new Socket(this.id, sIncoming);
        s.events.on("message", (message) => {
	    	// Identify message sender
	        if (message.from) {
				// Find destination
	            if (!this.connections[message.from]) {
	            	this.connections[message.from] = s;
	            }
        		this.events.emit('incoming', message, s );
	        }
        });
        /*s.events.once('disconnected', () => {
            this.connections[uuid] = undefined;
        });*/
	}
	
	send(uuid, message, callback, noCache = false) {

		// Find destination
		var destination;
		if (uuid instanceof Address) {
			destination = new Node(undefined, undefined, uuid, 'pending');
		} else {
			destination = this.reg.get(uuid);
		}

		message.from = this.id.uuid;

		// Bail out if destination not found
		if (!destination) {
			callback && callback(new Error("Recipient not found."), destination);
			return;
		}

		// Check if connection exists
		if (!noCache && this.connections[uuid]) {
			message.payload.publicIp = this.connections[uuid].remoteAddress;
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
				message.payload.publicIp = c.remoteAddress;
	            c.send(message);
	            callback && callback(undefined, destination);
	        });
	        c.events.once('disconnected', () => {
	            if (!noCache) this.connections[uuid] = undefined;
	            callback && callback(new Error("Connection failed", destination));
	        });
	        c.events.on('message',(message) => this.events.emit('incoming', message, c));

	        if (!noCache) this.connections[uuid] = c; 
	    }

	}

}

module.exports = Pool;