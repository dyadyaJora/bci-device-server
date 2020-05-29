const dgram = require('dgram');
const rp = require('request-promise');
const server = dgram.createSocket('udp4');
const config = require('../config.json');

const MEMCACHED_HOST = config.memcached.host;
const MEMCACHED_PORT = config.memcached.port;
const Memcached = require('memcached');
const memcached = new Memcached(MEMCACHED_HOST + ':' + MEMCACHED_PORT);

const kafka = require('kafka-node');
const ClientKafka = new kafka.KafkaClient({ kafkaHost: config.kafka.url });
const Producer = new kafka.HighLevelProducer(ClientKafka);
const { getTopic, TOPICS } = require('../controllers/kafka-service');

const BASE_URI = config.server.host;
const BASE_PORT = config.server.port;

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    let message = JSON.parse(msg);
    message['time'] = new Date();
    if (!(message.type && message.type === 'bandPower')) {
        return;
    }

    validateMessage(message)
        .then(exists => {
            if (exists) {
                console.log("Saving band power to queue...");
                return saveBandPowerToQueue(message);
            }

            let deviceSessionUrl = 'http://' + BASE_URI + ':' + BASE_PORT + '/api/v1/device/' + message.deviceId + '/session/' + message.sessionId;

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

function saveBandPowerToQueue(message) {
    let prepared = JSON.stringify(message);
    return new Promise((resolve, reject) => {
        Producer.send([{topic: TOPICS.DATA, messages: [ prepared ]}], (err, data) => {
            if (!!err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });
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

function getUdpServerPort() {
    let port = '';
    process.argv.slice(2).forEach(item => {
        let vals = item.split('=');
        if (vals.length !== 2) {
            return;
        }

        if (vals[0] === 'port') {
            port = vals[1];
        }
    });

    if (!port) {
        console.log('TARGET PORT not found!');
        process.exit();
    }

    return port;
}

(function startUdpServer() {
    let port = getUdpServerPort();
    getTopic(TOPICS.DATA)
        .then(() => {
            server.bind(port);
        }).catch(err => {
            console.log('Error starting udp server', err);
            process.exit();
        });
})();