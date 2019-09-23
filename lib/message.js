class Message {
    constructor(type, payload) {
        this.type = type;
        this.payload = payload;
    }
    serialize() {
    	return {
    		"type": this.type,
    		"payload": this.payload
    	}
    }
}

module.exports = Message;