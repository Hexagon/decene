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

grid = new contrib.grid({
	rows: 1,
	cols: 3,
	screen: screen
});

log = grid.set(0, 2, 1, 1, contrib.log, { 
	fg: "green",
	selectedFg: "green",
	label: 'Server Log'
});

var table = grid.set(0, 0, 1, 2, contrib.table,
 { keys: true
 , fg: 'white'
 , selectedFg: 'white'
 , selectedBg: 'blue'
 , interactive: true
 , label: 'Registry'
 , width: '30%'
 , height: '30%'
 , border: {type: "line", fg: "cyan"}
 , columnSpacing: 3 //in chars
 , columnWidth: [38, 10, 18,10,10] /*in chars*/ });

//allow control the table with the keyboard
table.focus()

log.log("GUI Initiated");

d = new Decent(512, 10, "1,3,3.7",false, 46464, false, "56k.guru", 47474);

d.events.on('repl',(node,messageType) => doLog("REPL:"+node.toString()+">"+messageType));
d.events.on('send',(node,messageType) => doLog("SEND:"+node+">"+messageType));
d.events.on('state',(prevState,curState) => {doLog("State changed:"+prevState+">"+curState);updateTable(d.reg.r);});
d.events.on('roaming',(goal,at) => doLog("Roaming: GOAL: "+goal+", at: "+at));
d.events.on('recv', (node,messageType) => doLog("RECV:"+node.toString()+">"+messageType));
d.events.on('error', (err) => doLog("ERR:"+err));
d.events.on('listening', (port) => doLog("Listening at "+port));
d.events.on('ip',(ip) => {doLog("Public ip changed by public demand:"+ip);});

d.reg.events.on('invalidate', () => updateTable(d.reg.r));
d.reg.events.on('dead', () => updateTable(d.reg.r));
d.reg.events.on('discover', () => updateTable(d.reg.r));
d.reg.events.on('update', () => updateTable(d.reg.r));

function updateTable(reg) {
	var data = [];
        
        data.push([
        	d.node.uuid || "N/A",
        	d.node.at || "N/A",
        	d.node.address ? ((d.node.address.ip || "") + " " + d.node.address.type) : "",
        	d.node.address ? d.node.address.port || "": "",
        	d.node.status || "N/A"
        ]);

   for (let [currIdx, currNode] of Object.entries(reg)) {

        data.push([
        	currNode.uuid || "N/A",
        	currNode.at || "N/A",
        	currNode.address ? currNode.address.ip || "" : "",
        	currNode.address ? currNode.address.port || "": "",
        	currNode.status || "N/A"
        ]);
    }
table.setData(
{ headers: ['UUID', 'Vector', 'IP', 'Port', 'State']
, data: data
});
}

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

screen.render();
