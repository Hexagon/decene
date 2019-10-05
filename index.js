var decent = require("./lib/network"),
    encryption = require("./lib/encryption"),
    gui = require("./lib/gui"),
    args = require("./lib/cli"),
    id;

if(args.init != undefined) {
    id = encryption.newIdentity();
}

// Check arguments
if(args.vector == undefined) {
    console.log("Vector is mandatory, see --help.");
    process.exit(0);
}

// Try to load identity
id = id || encryption.loadIdentity();
if (!id) {
    console.log("Could not load identity, run with --init or see --help");
    process.exit(0);
} 

function setTitle(d) {
    gui.setTitle(d.state, d.node.at, d.connectivity, d.reg.countAt(d.node.at,'alive'),d.reg.countAt(d.node.at), d.reg.count('alive'), d.reg.count());
}
// Init decent
var d = new decent(id, args.vector,args.ip,args.port,args.spawn);

// Handle network events
d.events.on('repl',(node, messageType) => gui.log.log("REPL:"+node.toString()+">"+messageType));
d.events.on('send',(node, message, err, res) => gui.log.log("SEND:"+node+">"+message.type+":"+err));
d.events.on('state',(prevState,curState) => {
    setTitle(d);
    gui.log.log("State changed:"+prevState+">"+curState);
    gui.updateTable(d.node, d.reg.r);
    gui.history.log("State changed:"+prevState+">"+curState);
});
d.events.on('roaming',(goal,at) => gui.log.log("Roaming: GOAL: "+goal+", at: "+at));
d.events.on('error', (err) => gui.log.log("ERR:"+err));
d.events.on('listening', (port) => gui.log.log("Listening at "+port));
d.events.on('ip',(ip) => {gui.log.log("Public ip changed by public demand:"+ip);});
d.events.on('recv', (message) => {
    gui.log.log("RECV:"+message.from.substr(message.from.length-12)+">"+message.type+message.payload);
    if (message.type=='broadcast') {
        gui.history.log('BROADCAST  IN@' + d.node.at + '> ' + message.payload.message);
    }
    gui.screen.render();
});
d.events.on('upnptry',() => {
    gui.log.log("Trying to open public port by UPnP.");
    setTitle(d);
});
d.events.on('upnpsuccess',() => {
    gui.log.log("UPnP Success.");
    setTitle(d);
});
d.events.on('upnpfail',(err) => {
    gui.log.log("UPnP Failure: ", err);
    setTitle(d);
});

// Handle registry events
d.reg.events.on('invalidate', () => gui.updateTable(d.node, d.reg.r));
d.reg.events.on('dead', () => gui.updateTable(d.node, d.reg.r));
d.reg.events.on('discover', (node) => {gui.updateTable(d.node, d.reg.r); gui.log.log('Discover: ' + node.uuid ); });
d.reg.events.on('update', (node) => {gui.updateTable(d.node, d.reg.r); ; gui.log.log('Update: ' + node.uuid ); });
d.reg.events.on('batch', (node) => {gui.updateTable(d.node, d.reg.r); ; gui.log.log('Registry batch updated.'); });

// Handle GUI events
gui.events.on('input', (i) => {
    var inText = i;
    if(d.broadcast(inText)) {
        gui.history.log('BROADCAST OUT@['+d.node.at+']> ' +inText);
    } else {
        gui.history.log('BROADCAST OUT@[void}> ' +i);
        gui.history.log("Broadcast failed, not recipients in range.");
    }
})
