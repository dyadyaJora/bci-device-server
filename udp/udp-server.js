const dgram = require('dgram');
const rp = require('request-promise');
const server = dgram.createSocket('udp4');
const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});
const MEMCACHED_HOST = '127.0.0.1';
const MEMCACHED_PORT = '12346';
const Memcached = require('memcached');
const memcached = new Memcached(MEMCACHED_HOST + ':' + MEMCACHED_PORT);

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    let message = JSON.parse(msg);

    if (!(message.type && message.type === 'bandPower')) {
        return;
    }

    validateMessage(message)
        .then(exists => {
            if (exists) {
                return saveBandPower(message);
            }

            let deviceSessionUrl = 'http://127.0.0.1:3001/api/v1/device/' + message.deviceId + '/session/' + message.sessionId;

            return rp.get(deviceSessionUrl)
                .then(data => {
                    console.log(data);
                    return new Promise((resolve) => resolve())
                });
        })
        .then((data) => {
            console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        })
        .catch(err => {
            console.error(err);
        })
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
    return influx.writePoints([point])
}

function validateMessage(message) {
    let deviceHash = message.deviceId;
    let sessionHash = message.sessionId;

    return new Promise((resolve, reject) => {
        memcached.get(sessionHash, function(err, data) {
           if (!!err) {
               reject(err);
               return;
           }

           if (!data) {
               resolve(false);
               return;
           }

           let exists = data.client.hash === deviceHash;
           resolve(exists);
        });
    });
}