const TOPICS = {
    DATA: 'data',
    CALC: 'calculations',
    OUTPUT: 'socket-output'
};
const config = require('../config.json');
const kafka = require('kafka-node');
const Consumer = kafka.Consumer;
const ClientKafka = new kafka.KafkaClient({ kafkaHost: config.kafka.url });
const Producer = new kafka.HighLevelProducer(ClientKafka);
const KeyedMessage = kafka.KeyedMessage;

const getConsumer = (topic) => {
    return new Consumer(ClientKafka, [{ topic: topic, partition: 0 }], {autoCommit: true});
};

const getTopic = (topic) => {
    return new Promise((resolve, reject) => {
        Producer.on('ready', function(errProducer, dataProducer) {
            Producer.createTopics([topic], true, function (err, data) {
                console.log('topic == ' + topic + ', data == ' + data);
                if (!!err) {
                    reject();
                    return;
                }

                resolve(true);
            });
        })
    });
};

function main() {
    console.log('aaaa');
    let consumer = getConsumer('test');
    consumer.on('message', data => {
        console.log(data);
    });
    let km = new KeyedMessage('key', 'message');
    Producer.on('ready', (err, data) => {
        Producer.send([{topic: 'test', messages: ['hello', 'world', km]}], (sendErr, sendData) => {
            console.log(sendData);
        })
    });
};

module.exports = {
    TOPICS,
    getConsumer,
    getTopic
}