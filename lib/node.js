var 
	Address = require("./address.js"),
	Vec = require("./vec.js"),
    uuidv1 = require('uuid/v1');

class Node {
    constructor(uuid, at, addr, status) {
        this.uuid = uuid;
        this.at = at;
        this.address = addr;
        this.status = status;
    }

    resolveNode(inData) {
        if (inData instanceof Node) {
        	this.at = inData.at;
            this.uuid = inData.uuid;
        	this.address = inData.address;
        	this.status = inData.status;
            this.state = inData.state;
        } else if (inData instanceof Address) {
        	this.address = inData;
        } else if (inData instanceof Vec) {
            this.at = inData;
        } else if (typeof inData == 'string' || inData instanceof String){
        	this.at = new Vec().fromString(inData);
        } else {
        	if (inData && inData.address && inData.address.ip) {
        		this.address = new Address(inData.address.ip, inData.address.port);
        	}
        	if (inData && inData.at) {
        		this.at = new Vec(inData.at.x,inData.at.y,inData.at.z);
        	}
            if (inData && inData.uuid) {
                this.uuid = inData.uuid;
            }
            if (inData && inData.status) {
                this.status = inData.status;
            }
            if (inData && inData.state) {
                this.state = inData.state;
            }
        }
        return this;
    }


    toString() {
        if (this.address && this.at) {
            return this.at.toString() + "@" + this.address.ip + ":" + this.address.port;
        } else if (this.address) {
            return "unknown@" + this.address.ip + ":" + this.address.port;
        } else if (this.at) {
            return this.at.toString();
        }
    }

}

module.exports = Node;