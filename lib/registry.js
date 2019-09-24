var Node = require("./node.js");

class Registry {
    constructor(size) {
        this.size = size;
        this.r = {};
    }
    add(n) {
        this.r[n.uuid] = n;
    }
    closest(goal) {
        var result = {
            dist: undefined,
            best: undefined
        };
        for (let currNode of Object.values(this.r)) {
            if (currNode && currNode.at) {
                let currDistance = currNode.at.distance(goal);
                if ((result.dist === undefined || currDistance < result.dist) && (currNode.status == 'alive')) {
                    result.best = currNode;
                    result.dist = currDistance;
                }
            }
        }
        return result.best;
    }
    update(n) {
        var resolved = new Node().resolveNode(n)
        if (resolved) {
            if (!this.r[resolved.uuid]) {
                //console.log('New node discovered ' + resolved.uuid + ':' + resolved.toString());
            } 
            this.r[n.uuid] = resolved;
        }
    }
    batchUpdate(r) {
        for(let n of Object.values(r)) {
            if (n && n.status == 'alive') {
                this.update(n);   
            }
        }
    }
    dead(n) {
        this.r[n.uuid].status = 'dead';
    }
    serialize() {
        return this.r;
    }
}

module.exports = Registry;