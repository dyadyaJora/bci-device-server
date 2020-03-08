var SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
const rp = require('request-promise');
var port = new SerialPort('/dev/ttyACM0', {baudRate: 9600});

const MAX_BATCH_SIZE = 100;
const MAX_DELAY_MS = 2000;
// const BASE_HOST = 'http://192.168.1.3:3001'
const BASE_HOST = 'http://localhost:3001'
const DEVICE_ID = "my_device_1"

console.log("Script starting...");

// Pipe the data into another stream (like a parser or standard out)
const lineStream = port.pipe(new Readline())

var initInterval;
let batch = [];
let tmp = [];
lineStream.on('data', line => {
	let date = new Date();
	debugger;
	if (isNeedSend(batch, date)) {
		tmp = [].concat(batch);
		batch = []
		// @todo http send
        rp({
            method: 'POST',
            uri: BASE_HOST + '/api/v1/sensor',
            body: {
                data: tmp,
                deviceId: DEVICE_ID
            },
            json: true
        });
		console.log("Sended tmp");
	}

	let vars = line.split(';');
    let pulse = vars[0];
    let valid = vars[1];
    let peek = vars[2];
    let analog= vars[3];
	let data;

    if (pulse != undefined && valid != undefined && peek != undefined && analog != undefined) {
	    data = {
            analog: analog.replace(/\r$/, ''),
            peek: peek,
            valid: valid,
            pulse: pulse,
            timestamp: new Date().getTime()
	    }

		batch.push(data);
    }

	clearInterval(initInterval)
})

initInterval = setInterval( () =>
	port.write('R', (err, data) => {console.log(err, data)}),
	1000
);

function isNeedSend(batch, currentDate) {
	return batch.length > MAX_BATCH_SIZE || currentDate.getTime() - getMinTime(batch) >  MAX_DELAY_MS;
}

function getMinTime(batch) {
	return Math.min.apply(null, batch.map(item => item.timestamp));
}