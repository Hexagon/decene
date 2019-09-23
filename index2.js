var Decent = require("./lib/decent.js");

console.log('Decent is starting up!');
var d = new Decent(512, 10, "1,3,3.8", false, 46464, false, "127.0.0.1",47474);
d.locate();

//var d = new Decent(512, 10, false);

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