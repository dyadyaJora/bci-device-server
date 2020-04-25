const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    let message = JSON.parse(msg);
    if (message.type && message.type === 'bandPower') {
        saveBandPower(message);
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(12345);

function saveBandPower(message) {
    let alfa = 0, beta = 0;
    message.data.forEach(item => { alfa += item[0]; beta+=item[1];} );
    let res = beta/alfa;
    let point = {
        measurement: 'band_power',
        tags: {
            deviceId: message.deviceId,
            sessionId: message.sessionId
        },
        fields: {
            band: res
        },
        timestamp: +(new Date()) + "000000"
    }
    influx.writePoints([point])
        .then((data) => {
            console.log("Data saved!")
        });

}