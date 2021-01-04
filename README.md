# Work in progress

For real.

# Usage

## Short version

See repository [hexagon/decene-examples](https://github.com/hexagon/decene-examples)```

## A little longer version

Fairly complete and minimal example of how to use decent... Untested code!

```javascript
const 
    { network, encryption } = require("decene"),
    fs = require('fs'); // fs is used to read/write registry cache to disk

// Settings
let idLocation = '~/.decene.id';
let cacheLocation = "~/.decene.registy";

// Try to load identity from cache, or create a new identity
let id = encryption.loadIdentity(idLocation);
if (!id) {
    // Create
    id = encryption.newIdentity(idLocation);
    if (!id) {
        console.log("Could not read or create identity, bailing out.");
        process.exit(0);
    } else {
        console.log("New identity generated and stored at " + cacheLocation);
    }
} 

// Try to load registry cache
let cache;
try {
    cache = JSON.parse(fs.readFileSync(cacheLocation, 'utf8'));
} catch (err) {
    console.error('Warning: Could not load cache.');
}

// Set up network client, listen at 0.0.0.0:47474, use my.decent.spawn.address.fake:47474 as "spawn" in case no local cache is available
var d = new network(id,"0.0.0.0","47474","my.decent.spawn.address.fake:47474",cache);

// Handle network events
d.events.on('state:changed',(prevState,curState) => {
    console.log("State changed: "+prevState+" -> "+curState);
});
d.events.on('server:error', (err) =>        console.error("Server Error:"+err));
d.events.on('socket:error', (err) =>        console.error("Socket Error:"+err));
d.events.on('error', (err) =>               console.error("Generic Error:"+err));

d.events.on('server:listening', (port) =>   console.log("Listening at " + port));
d.events.on('ip:changed',(ip) =>            console.log("Public ip verified: "+ip));

// A message is received (could be core, or application specific message)
d.events.on('message:received', (message, socket) => {
    if (message.type) {
        let hasPayload = message.payload ? "yes" : "no";
        console.log(message.type + ' > payload : ' + hasPayload);
    }
});

// A unhandled message is received this is an invalid, or application specific message
d.events.on('message:unhandled', (message, socket) => {
    if (message.type === "mycustommessage") {
        let hasPayload = message.payload ? "yes" : "no";
        console.log("Custom message received > payload : " + hasPayload);
    }
});

// Handle registry events
d.events.on('node:discover', (node) => {    console.log('Discover: ' + node.uuid );  });

// Handle registry disk cache
d.events.on('registry:batch', (node) => {
    fs.writeFile(cacheLocation, JSON.stringify(d.reg.serialize()), err => {
      if (err) {
        gui.log.log("Registry cache flush failed: " + err);
        return;
      } else {
        gui.log.log("Registry cache flushed to disc");
      }
    })
});
```


# Development

1. Clone decene adjacent to your reference project, using decent-examples

```bash
cd my-projects-folder
git clone ..../decene
git clone ..../decene-examples
```

2. Edit the decene imort in the reference project, example

```javascript
// Local decene development using adjacent dir
var {network, encryption } = require("../../decene/lib"),

// Normal mode, using decene from npmjs
// var {network, encryption } = require("decene"),
```

3. Build decene, to generate lib folder from typescript code

```bash
cd decene
npm run-script build
```

4. Run your reference project, now you are using the local version of decene

5. When you are ready to commit to decene, make sure everything is formatted, linted, tested and do build

```bash
npm run-script format
npm run-script lint
npm run-script test
npm run-script build

git add .
git commit -m "Yay, committing working and tested code."
```
