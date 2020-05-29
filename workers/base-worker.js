const config = require('../config.json');
const kafka = require('kafka-node');
const ClientKafka = new kafka.KafkaClient({ kafkaHost: config.kafka.url });
const Producer = new kafka.HighLevelProducer(ClientKafka);
const kafkaService = require('../controllers/kafka-service');

class BaseWorker {
    constructor(topicName, workerName) {
        if (this.constructor === BaseWorker) {
            throw new TypeError('Abstract class "BaseWorker" cannot be instantiated directly.');
        }

        this.topicName = topicName;
        this.workerName = workerName;
    }

    start() {
        kafkaService.getTopic(this.topicName)
            .then(res => {
                this.consumer = kafkaService.getConsumer(this.topicName);
                if (!this.consumer) {
                    throw  new Error('Error creating kafka consumer');
                }
                this.printStartingMessage();
                this.subscribe();
            })
            .catch(err => {
                console.error(err);
            })
    }

    subscribe() {
        this.consumer.on('message', message => {
            console.log('[' + this.workerName + '] getting data === ', message);
            let data;
            try {
                data = JSON.parse(message.value);
            } catch (e) {
                return;
            }

            this.process(data);
        });
    }

    process(data) {
        throw new Error('Override this method!');
    }

    printStartingMessage() {
        console.log('[' + this.workerName + '] worker started');
    }

    sendToWorker(topicName, data) {
        let jsonString = JSON.stringify(data);
        return new Promise((resolve, reject) => {
            Producer.send([{ topic: topicName, messages: [ jsonString ]}], (err, res) => {
                if (!!err) {
                    reject(err);
                    return
                }

                resolve(res);
            });
        });
    }
}

module.exports = BaseWorker;