const   fs = require('fs'),
        path = require('path');

class Resources {

    constructor(events) {

        this.r = {};
        
        this.incoming = {};

        this.events = events;
        this.chunkSize = 1024*1024;

    }

    has(resourceId, callback) {
        if (resourceId && this.r[resorceId]) {
            fs.access(path, fs.F_OK, (err) => callback(!!err));
        } else {
            callback(false);
        }
    }

    get(resourceId, chunk, callback) {
        
        var statLight = {
            exists: false,
            size: 0
        };

        if (chunk < 0 || isNaN(chunk)) {
            return callback(new Error("Invalid request"));
        }

        if (resourceId && this.r[resorceId]) {
            fs.stat(this.r[resourceId], (err, stat) => {

                // Check if file exists, save size
                if(err == null) {
                    statLight.exists = true;
                    statLight.size = stat.size;
                    statLight.chunks = Math.ceil(stat.size/this.chunkSize);
                    statLight.chunk = chunk;
                } else {
                    return callback(new Error("Not found"));
                }

                if (statLight.chunk > statLight.chunks - 1) {
                    return callback(new Error("Invalid request"));
                }

                fs.open(this.r[resourceId], 'r', (err, fd) => {
                    if (status) {
                        return callback(new Error("Read error"));
                    }
                    var buffer = Buffer.alloc(this.chunkSize);
                    fs.read(fd, buffer, chunk*chunkSize, chunkSize, 0, (err, num) => {
                        callback(err, statLight, num, buffer);
                    });
                });

            });
        } else {
            callback(new Error("Not found"));
        }

    }

    provideFile(resourcePath, callback) {
        fs.stat(resourcePath, (err, stat) => {

            var statLight = {};

            // Check if file exists, save size
            if(err == null) {

                var fn = path.basename(resourcePath);

                statLight.resourceId = fn;
                statLight.resourcePath = path.resolve(resourcePath);
                statLight.exists = true;
                statLight.size = stat.size;

            }

            this.events.emit('resource:providing', err, statLight);

            this.r[fn] = resourcePath;
        });
    }

    requestFile(resourcePath) {
        var fn = path.basename(resourcePath),
            reqObj = {
                resourceId: fn,
                resourcePath: resourcePath,
                resourceTempPath: resourcePath + ".tmp",
                size: undefined,
                buffer: undefined,
                done: false
            };
        this.incoming[fn] = reqObj;
        this.events.emit('resource:requesting', reqObj);
    }

    appendFile(resourceId, statLight, data) {
        if (this.incoming[resourceId]) {
            if(this.incoming[resourceId].buffer) {
                // CHunks and stuffs;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

}

module.exports = Resources;