const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});

const kafka = require('kafka-node');
const ClientKafka = new kafka.KafkaClient(config.kafka.url);
const Producer = new kafka.HighLevelProducer(ClientKafka);
const { getConsumer, TOPICS } = require('../controllers/kafka-service');

let consumer = getConsumer(TOPICS.DATA);


consumer.on('message', message => {
    console.log(message);
    let value = JSON.parse(message.value);
    saveBandPower(value)
        .then(() => {
            console.log('saved');
            let messageForCalc = {
                sessionId: value.sessionId,
                deviceId: value.deviceId,
                type: value.type,
                time: value.time
            }
            Producer.send([{ topic: TOPICS.CALC, messages: [value]}], (err, res) => {})
        })
        .catch(err => {
            console.error(err);
        })
});

function saveBandPower(value) {
    let fieldObject = {};
    value.data.forEach((item, i) => {
        fieldObject['band' + i] = item;
    });
    let point = {
        measurement: 'band_power',
        tags: {
            deviceId: value.deviceId,
            sessionId: value.sessionId
        },
        fields: fieldObject,
        timestamp: +new Date(value.time) + "000000"
    }
    return influx.writePoints([point])
}