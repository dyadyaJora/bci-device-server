var SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
var port = new SerialPort('/dev/ttyACM0', {baudRate: 9600});


console.log("Script starting...");

// Pipe the data into another stream (like a parser or standard out)
const lineStream = port.pipe(new Readline())

var interval;
lineStream.on('data', line => {
	let date = new Date();
	let strRes = line.toString() + ' ' + date.toISOString();
	console.log(line);
	console.log(strRes);
	clearInterval(interval)
})

interval = setInterval( () =>
	port.write('R', (err, data) => {console.log(err, data)}),
	1000
);
