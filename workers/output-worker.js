const BaseWorker = require('./base-worker');
const { TOPICS } = require('../controllers/kafka-service');
const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});

class OutputInfluxWorker extends BaseWorker {
    constructor() {
        super(TOPICS.OUTPUT, 'Output_State');
    }

    process(data) {
        if (!data.time) {
            console.log('WRONG data');
            return;
        }
        let pen = data.pen;
        let mono = data.mono;
        let stable = data.stable;
        let sessionId = data.sessionId;

        let res;
        if (pen > mono && pen > stable) {
            res = 'stress';
        } else if (stable > pen && stable > mono) {
            res= 'stable';
        } else {
            res = 'monotony';
        }

        influx.writePoints([
            {
                measurement: 'state_status',
                tags: {
                    sessionId: data.sessionId
                },
                fields: { state: res },
                timestamp: +new Date(data.time) + '000000'
            }
        ]).then(() => {
            console.log('[' + this.workerName + '] saved');
        }).catch((err) => {
            console.error('[' + this.workerName + ']', err);
        });
    }
}

let worker = new OutputInfluxWorker();

worker.start();