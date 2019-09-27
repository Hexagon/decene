class Address {

    constructor(ip, port, type) {
        this.ip = ip;
        this.port = port;
        this.type = type || "unknown";
    }

}

module.exports = Address;