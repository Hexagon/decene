var Node = require("./node.js"),
    EventEmitter = require('events');

class Registry {
    constructor(self) {
        this.r = {};
        this.self = self;

        this.events = new EventEmitter();
    }
    closest(goal, status) {
        var result = {
            dist: undefined,
            best: undefined
        };
        for (let currNode of Object.values(this.r)) {
            if (currNode && currNode.at) {
                let currDistance = currNode.at.distance(goal);
                if ((result.dist === undefined || currDistance < result.dist) && (currNode.status == status)) {
                    result.best = currNode;
                    result.dist = currDistance;
                }
            }
        }
        return result.best;
    }
    allAt(v) {
        var result = [];
        for (let currNode of Object.values(this.r)) {
            if (currNode && currNode.at.eq(v)) {
                result.push(currNode);
            }
        }
        return result;
    }
    invalidate() {
        for (let currNode of Object.values(this.r)) {
            if (Date.now() - currNode.lastUpdate > 24*60*60*1000) {
                this.events.emit('dead', this.r[currNode.uuid]);
                this.r[currNode.uuid] = undefined;
                delete this.r[currNode.uuid];
            } else
            if (Date.now() - currNode.lastUpdate > 30000) {
                this.events.emit('invalidate', this.r[currNode.uuid]);
                currNode.invalidate();
            }
        }
    }
    update(n) {
        var resolved = new Node().resolveNode(n);
        if (resolved && resolved.uuid != this.self.uuid) {
            if (!this.r[resolved.uuid]) {
                this.events.emit('discover', resolved);
                //console.log('New node discovered ' + resolved.uuid + ':' + resolved.toString());
            } else {
                this.events.emit('update', resolved);
            }
            resolved.flagUpdated();

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
    serialize() {
        return this.r;
    }
    isEmpty() {
        return !Object.values(this.r).length;
    }
}

module.exports = Registry;