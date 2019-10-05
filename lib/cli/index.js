var
    package= require('../../package.json'),
	args = require('minimist')(process.argv.slice(2), {
		string: ['ip','port','spawn','vector','init'],
		boolean: ['version','help'],
		default: {
			ip: '0.0.0.0',
			port: 47474,
			spawn: '56k.guru:47474'
		},
		alias: { v: 'version', h: 'help', i: 'ip', p: 'port', s: 'spawn'}
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

if (args.version) {
    printVersion();
    process.exit(0);
}

if (args.help) {
    printVersion();
    console.log(`
                --init          Generate RSA-keys and UUID
                --vector        Set vector, example: --vector 1,3,5
        -i      --ip            Set listen ip (Default: 0.0.0.0) 
        -p      --port          Set public port (Default: 47474)
        -v      --version       Print version
        -h      --help          This help
    `);
    process.exit(0);       
}

module.exports = args;