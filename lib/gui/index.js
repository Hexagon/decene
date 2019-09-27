var
    blessed = require('blessed'),
    contrib = require('blessed-contrib'),
    screen = blessed.screen({smartCSR: true}),
    grid, map, log;

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

function updateTable(node, reg) {
	var data = [];
        data.push([
        	node.uuid || "N/A",
        	node.at || "N/A",
        	node.address ? ((node.address.ip || "") + " " + node.address.type) : "",
        	node.address ? node.address.port || "": "",
        	node.status || "N/A"
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

screen.render();

module.exports = {
    updateTable,
    screen,
    log
};