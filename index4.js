var Decent = require("./lib/decent.js");

console.log('Decent is starting up!');
var d = new Decent(512, 10, "1,3,3.9", false, 48484, false, "127.0.0.1",46464);
d.locate();