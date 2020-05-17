const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});
const config = require('../config.json');
const kafka = require('kafka-node');
const ClientKafka = new kafka.KafkaClient(config.kafka.url);
const Producer = new kafka.HighLevelProducer(ClientKafka);
const { getConsumer, TOPICS } = require('../controllers/kafka-service');

let consumer = getConsumer(TOPICS.OUTPUT);

consumer.on('message', message => {
    console.log(message);
    let value;
    try {
        value = JSON.parse(message.value);
    } catch (e) {
        return;
    }

    let pen = value.pen;
    let mono = value.mono;
    let stable = value.stable;
    let sessionId = value.sessionId;

    let res;
    if (pen > mono && pen > stable) {
        res = "stress";
    } else if (stable > pen && stable > mono) {
        res= "stable";
    } else {
        res = "monotony";
    }

    influx.writePoints([
        {
            measurement: "state_status",
            tags: {
                sessionId: value.sessionId
            },
            fields: { state: res },
            timestamp: +new Date(value.time) + "000000"
        }
    ]);
});

console.log("OUTPUT WORKER STARTED");