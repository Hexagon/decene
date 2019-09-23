var Decent = require("./lib/decent.js");

//var d = new Decent(512, 10, false, 46464, false, "http://127.0.0.1:47474");

console.log('Decent \"SERVER\" is starting up!');
var d = new Decent(512, 10, "1,3,3.7",false);
d.locate();
/*
d.on('message', function(m) {

});

d.on('transport', function(m, socket) {
    d.send(m, function(err, res) {
        if (err) {
            // d.notifyError(socket);
        }
        // d.nofifySuccess(socket);
    });
});

d.on('error', function(e) {

});*/