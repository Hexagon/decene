var
    EventEmitter = require('events'),
    Socket = require("./socket.js"),
    Address = require("./address.js"),
    Node = require("./node.js");

class Pool {

	constructor(registry, uuid) {
		this.connections = {};
		this.reg = registry;
		this.events = new EventEmitter();
		this.uuid = uuid;
	}

	incoming(sIncoming) {
	    var s = new Socket(sIncoming);
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
        s.events.once('disconnected', () => {
            this.connections[uuid] = undefined;
        });
	}
	
	send(uuid, message, callback) {

		// Find destination
		var destination;
		if (uuid instanceof Address) {
			destination = new Node(undefined, undefined, uuid, 'pending');
		} else {
			destination = this.reg.get(uuid);
		}

		message.from = this.uuid;

		// Bail out if destination not found
		if (!destination) {
			callback && callback(new Error("Recipient not found."), destination);
			return;
		}

		// Check if connection exists
		if (this.connections[uuid] && this.connections[uuid].send(message)) {
			callback && callback(undefined, destination);
			return;
		}

		// Create connection
		if (destination.address && destination.address.ip) {
			var c = new Socket(destination);
	        c.events.once('connected', () => {
	            c.send(message);
	            callback && callback(undefined, destination);
	        });
	        c.events.once('disconnected', () => {
	            this.connections[uuid] = undefined;
	        });
	        c.events.once('failed', (err) => {
	            callback && callback(err, destination);
	        });
	        c.events.on('message',(message) => this.events.emit('incoming', message, c));

	        this.connections[uuid] = c; 
	    }

	}

}

module.exports = Pool;