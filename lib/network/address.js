class Address {

    constructor(ip, port, type) {

    	if (ip && ip.indexOf && ip.indexOf(":") > 0) {
    		var sArr = ip.split(":");
    		if (sArr.length == 2 && !isNaN(sArr[1])) {
    			this.ip = sArr[0];
    			this.port = sArr[1];
    		}
    	} else {
	        this.ip = ip;
	        this.port = port;	
    	}
        this.type = type || "public";
    }

    toString() {
        return this.ip + ":" + this.port;
    }

}

module.exports = Address;