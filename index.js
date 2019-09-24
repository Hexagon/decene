var Decent = require("./lib/decent.js"),
	blessed = require('blessed'),
	contrib = require('blessed-contrib'),
	screen = blessed.screen({smartCSR: true}),
	grid, map, log,
	d;

function doLog(msg) {
	log.log(msg);
	screen.render();
}

grid = new contrib.grid({rows: 1, cols: 3, screen: screen});

map = grid.set(0, 0, 1, 2, contrib.map, {
	label: 'Nodes Location'
});

map.addMarker({
	"lon" : "16.0000",
	"lat" : "65.4000",
	color: "red",
	char: "X" 
});

log = grid.set(0, 2, 1, 1, contrib.log, { 
	fg: "green",
	selectedFg: "green",
	label: 'Server Log'
});

log.log("GUI Initiated");

d = new Decent(512, 10, "1,3,3.7",false);
d.locate();

d.events.on('repl',(node,messageType) => doLog("REPL:"+node.toString()+">"+messageType));
d.events.on('send',(node,messageType) => doLog("SEND:"+node+">"+messageType));
d.events.on('state',(prevState,curState) => doLog("State changed:"+prevState+">"+curState));
d.events.on('roaming',(goal,at) => doLog("Roaming: GOAL: "+goal+", at: "+at));
d.events.on('recv', (node,messageType) => doLog("REPL:"+node.toString()+">"+messageType));
d.events.on('error', (err) => doLog("ERR:"+err));
d.events.on('listening', (port) => doLog("Listening at "+port));

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
 return process.exit(0);
});

screen.render();
