var decent = require("./lib/network"),
    gui = require("./lib/gui"),
    args = require("./lib/cli");

// Check arguments
if(args.vector == undefined) {
    console.log("Vector is mandatory, see --help.");
    process.exit(0);
}

// Init decent
var d = new decent(args.vector,args.ip,args.port,args.spawn);

// Handle network events
d.events.on('repl',(node,messageType) => gui.log.log("REPL:"+node.toString()+">"+messageType));
d.events.on('send',(node,message) => gui.log.log("SEND:"+node+">"+message.type));
d.events.on('state',(prevState,curState) => {
    gui.log.log("State changed:"+prevState+">"+curState);
    gui.updateTable(d.node, d.reg.r);
    gui.history.log("State changed:"+prevState+">"+curState);
    gui.setTitle(curState, d.node.at);
});
d.events.on('roaming',(goal,at) => gui.log.log("Roaming: GOAL: "+goal+", at: "+at));
d.events.on('error', (err) => gui.log.log("ERR:"+err));
d.events.on('listening', (port) => gui.log.log("Listening at "+port));
d.events.on('ip',(ip) => {gui.log.log("Public ip changed by public demand:"+ip);});
d.events.on('recv', (node, message) => {
    gui.log.log("RECV:"+node.toString()+">"+message.type);
    if (message.type=='broadcast') {
        gui.history.log('BROADCAST  IN@' + node.at + '> ' + message.payload);
    }
});
d.events.on('upnptry',() => {gui.log.log("Trying to open public port by UPnP.");});
d.events.on('upnpsuccess',() => {gui.log.log("UPnP Success.");});
d.events.on('upnpfail',(err) => {gui.log.log("UPnP Failure: ", err);});

// Handle registry events
d.reg.events.on('invalidate', () => gui.updateTable(d.node, d.reg.r));
d.reg.events.on('dead', () => gui.updateTable(d.node, d.reg.r));
d.reg.events.on('discover', () => gui.updateTable(d.node, d.reg.r));
d.reg.events.on('update', () => gui.updateTable(d.node, d.reg.r));

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
