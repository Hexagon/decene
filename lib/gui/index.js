var
    blessed = require('blessed'),
    contrib = require('blessed-contrib'),
    screen = blessed.screen({
        smartCSR: true,
        terminal: 'xterm-256color',
        fullUnicode: true
    }),
    EventEmitter = require('events'),
    events = new EventEmitter(),
    colors = require('colors/safe'),
    package= require('../../package.json'),
    theme = {
        headerBg:25,
        headerFg:231,
        footerBg:25,
        footerFg:231,
        mainWindowBg:234,
        inactiveTabBg:17

    };

function doLog(msg) {
    log.log(colors.red(msg));
    screen.render();
}

var log = contrib.log({
    top: 3,
    left: 0,
    width: '100%',
    padding: 1,
    height: '100%-5', 
    label: 'Server Log',
    bg: theme.mainWindowBg
});

var history = contrib.log({ 
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-5',
    padding: 0,
    bg: theme.mainWindowBg
});

var table = contrib.table({ 
    keys: true,
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-5',
    padding: 1,
    bg: theme.mainWindowBg
 , interactive: true
 , columnSpacing: 3 //in chars
 , columnWidth: [38, 10, 18,10,10] /*in chars*/ });

var statusBar = blessed.listbar({
    bottom: 0,
    width:'100%', 
    height: 1,
    border: 0,
    style: {
        fg: theme.footerFg,
        bg: theme.footerBg
    }
});

var textBox = blessed.textbox({
    bottom: 1,
    left: 3,
    width: '100%-3',
    height: 1,
    padding: 0,
    style: {
        fg: "white",
        bg: 235
    }
});

var text = blessed.text({
    bottom: 1,
    left: 0, 
    width: 3,
    height: 1,
    border: 0,
    style: {
        bg: 235
    },
    content: "  :"
});

var textTop = blessed.text({
    top: 0,
    left: 0, 
    width: '100%',
    height: 3,
    border: 0,
    style: {
        bg: theme.headerBg,
        fg: theme.headerFg
    },
    content: "  " + package.name + " " + package.version
});

var tabTop1A = blessed.text({
    top: 2,
    left: 2, 
    width: 20,
    height: 1,
    align: 'center',
    border: 0,
    style: {
        bg: theme.mainWindowBg
    },
    content: "       History"
});
var tabTop1I = blessed.text({
    top: 2,
    left: 2, 
    width: 20,
    height: 1,
    align: 'center',
    border: 0,
    style: {
        bg: theme.inactiveTabBg
    },
    content: "     (H)istory"
});
var tabTop2A = blessed.text({
    top: 2,
    left: 24, 
    width: 20,
    height: 1,
    align: 'center',
    border: 0,
    style: {
        bg: theme.mainWindowBg
    },
    content: "     System Log"
});
var tabTop2I = blessed.text({
    top: 2,
    left: 24, 
    width: 20,
    height: 1,
    align: 'center',
    border: 0,
    style: {
        bg: theme.inactiveTabBg
    },
    content: "    System (L)og"
});
var tabTop3A = blessed.text({
    top: 2,
    left: 46, 
    width: 20,
    height: 1,
    align: 'center',
    border: 0,
    style: {
        bg: theme.mainWindowBg
    },
    content: "      Registry"
});
var tabTop3I = blessed.text({
    top: 2,
    left: 46, 
    width: 20,
    height: 1,
    border: 0,
    style: {
        bg: theme.inactiveTabBg
    },
    content: "     (R)egistry"
});

screen.append(textTop);
screen.append(log);
screen.append(history);
screen.append(table);
screen.append(statusBar);
screen.append(text);
screen.append(textBox);

screen.append(tabTop1A);
screen.append(tabTop2A);
screen.append(tabTop3A);

screen.append(tabTop1I);
screen.append(tabTop2I);
screen.append(tabTop3I);

statusBar.setItems({
    "Quit":{keys:"Q"},
    "Network Log":{keys:"L"},
    "History":{keys:"H"},
    "Registry":{keys:"R"}
});

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

log.show();
table.hide();

tabTop3A.hide();
tabTop3I.show();
tabTop2A.hide();
tabTop2I.show();
tabTop1A.show();
tabTop1I.hide();


screen.render();

// Exit on key presses
screen.key(['q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

screen.key(['r'], function(ch, key) {
    log.hide();
    history.hide();
    table.show();

    tabTop3A.show();
    tabTop3I.hide();
    tabTop2A.hide();
    tabTop2I.show();
    tabTop1A.hide();
    tabTop1I.show();

    screen.render();
});

screen.key(['h'], function(ch, key) {
    log.hide();
    history.show();
    table.hide();

    tabTop3A.hide();
    tabTop3I.show();
    tabTop2A.hide();
    tabTop2I.show();
    tabTop1A.show();
    tabTop1I.hide();

    screen.render();
});

screen.key(['l'], function(ch, key) {
    log.show();
    history.hide();
    table.hide();

    tabTop3A.hide();
    tabTop3I.show();
    tabTop2A.show();
    tabTop2I.hide();
    tabTop1A.hide();
    tabTop1I.show();

    screen.render();
});

screen.key([':'], function(ch, key) {
    //allow control the table with the keyboard
    textBox.readInput((err, i) => {
        events.emit('input', i);
        textBox.clearValue();
        screen.render();
    });
});

screen.key(['t'], function(ch, key) {

});

function setTitle(status, vector) {
    //52
    //202
    //22
    textTop.setText("  " + package.name + " " + package.version + " - [" + status + "@" + vector + "]");
    screen.render();
}

module.exports = {
    updateTable,
    screen,
    log,
    history,
    events,
    setTitle
};