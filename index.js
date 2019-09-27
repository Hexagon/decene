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

// Exit on key presses
gui.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

// Handle network events
d.events.on('repl',(node,messageType) => gui.log.log("REPL:"+node.toString()+">"+messageType));
d.events.on('send',(node,messageType) => gui.log.log("SEND:"+node+">"+messageType));
d.events.on('state',(prevState,curState) => {gui.log.log("State changed:"+prevState+">"+curState);gui.updateTable(d.node, d.reg.r);});
d.events.on('roaming',(goal,at) => gui.log.log("Roaming: GOAL: "+goal+", at: "+at));
d.events.on('recv', (node,messageType) => gui.log.log("RECV:"+node.toString()+">"+messageType));
d.events.on('error', (err) => gui.log.log("ERR:"+err));
d.events.on('listening', (port) => gui.log.log("Listening at "+port));
d.events.on('ip',(ip) => {gui.log.log("Public ip changed by public demand:"+ip);});

// Handle registry events
d.reg.events.on('invalidate', () => gui.updateTable(d.reg.r));
d.reg.events.on('dead', () => gui.updateTable(d.reg.r));
d.reg.events.on('discover', () => gui.updateTable(d.reg.r));
d.reg.events.on('update', () => gui.updateTable(d.reg.r));
