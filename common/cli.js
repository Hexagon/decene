var
    package= require('../package.json'),
    os = require('os'),
	args = require('minimist')(process.argv.slice(2), {
		string: ['ip','port','spawn','vector','init',],
		boolean: ['version','help'],
		default: {
			address: '0.0.0.0',
            port: 47474,
            init: false,
			spawn: false,
            identity: os.homedir() + '/.decent.id',
            cache: os.homedir() + '/.decent.registry.cache',
            provide: false,
            request: false
		},
		alias: { v: 'version', h: 'help', a: 'address', p: 'port', s: 'spawn', i: 'identity', c: 'cache', e: 'vector'}
	});

function printHeader() {
    console.log(package.name + " " + package.version);
    console.log("Copyright (c) 2019 " + package.author);
}

function printVersion() {
    console.log(package.name + " " + package.version);
    console.log("Copyright (c) 2019 " + package.author);
    console.log(package.license + " license");
}

function printHelp() {
    console.log(`
                --init          Generate RSA-keys and UUID
        -s      --spawn         

        -e      --vector        Set vector, example: --vector 1,3,5

        -a      --address       Set listen ip (Default: 0.0.0.0) 
        -p      --port          Set public port (Default: 47474)

        -i      --identity      Identity file (Default: ~/.decent.id)
        -c      --cache         Cache file (Default: ~/.decent.registry.cache)

        -v      --version       Print version
        -h      --help          This help
    `);
}

if (args.version) {
    printVersion();
    process.exit(0);
}

if (args.help) {
    printVersion();
    printHelp();
    process.exit(0);       
}

module.exports = args;