var decent = require("../lib/network"),
    encryption = require("../lib/encryption"),
    args = require("../common/cli"),
    fs = require('fs'),
    id;

// Create new identity?
if(args.init !== false) {
    id = encryption.newIdentity(args.identity);
    console.log("New identity generated and stored at " + args.identity);
}

// Check arguments
if(args.vector == undefined) {
    if (args.init !== false) {
        process.exit(0);
    } else {
        console.log("Vector is mandatory, see --help.");
        process.exit(0);   
    }
}

// Try to load identity
id = id || encryption.loadIdentity(args.identity);
if (!id) {
    console.log("Could not load identity, run with --init or see --help\n");
    process.exit(0);
} 

// Try to load cache
var cache;
try {
    cache = JSON.parse(fs.readFileSync(args.cache, 'utf8'));
} catch (err) {
    console.error('Warning: Could not load cache.');
}

// Init decent
var d = new decent(id, args.vector,args.address,args.port,args.spawn, cache);

// 
if (args.provide) {
    d.resources.provideFile(args.provide);
}

// Handle network events
d.events.on('message:send',(node, message, err, res) => {
    if (message.type=='broadcast') {
        console.log('BROADCAST OUT@' + d.node.at + '> ' + message.payload.message);
    }
});
d.events.on('message:received', (message) => {
    if (message.type=='broadcast') {
        console.log('BROADCAST IN@' + d.node.at + '> ' + message.payload.message);
    }
});

d.events.on('resource:providing',(err,stat) => {
    if (err) {
        console.log("Error occurred while providing file: "+err);
    } else {
        console.log("Providing resource '" + stat.resourceId + "' from '" + stat.resourcePath);
    }
});

d.events.on('state:changed',(prevState,curState) => {
    console.log("State changed: "+prevState+" -> "+curState);
});
d.events.on('server:error', (err) => console.log("ERR:"+err));
d.events.on('server:listening', (port) => console.log("Listening at " + port));
d.events.on('ip:changed',(ip) => {
    console.log("Public ip verified: "+ip);
});

d.events.on('upnp:success',() => {
    console.log("UPnP Success.");
    
});

// Handle registry events
d.events.on('node:discover', (node) => { console.log('Discover: ' + node.uuid );  });