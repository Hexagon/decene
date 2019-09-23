var Decent = require("./lib/decent.js");

console.log('Decent \"SERVER\" is starting up!');
var d = new Decent(512, 10, "1,3,3.7",false);
d.locate();