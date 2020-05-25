const BaseWorker = require('./base-worker');
const { TOPICS } = require('../controllers/kafka-service');
const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});

class SimpleCalcWorker extends BaseWorker {
    constructor() {
        super(TOPICS.CALC, 'Simple_Calc');
    }

    process(value) {
        let type = value.type;
        if (type !== 'bandPower') {
            return;
        }

        let sessionId = value.sessionId
        let deviceId = value.deviceId;
        let time = value.time;

        if (!deviceId || !sessionId) {
            return;
        }

        differentiateState(deviceId, sessionId, time)
            .then((data) => {
                console.log('DATA == ', data);
                let messageForOutput = {
                    pen: data.pen,
                    stable: data.stable,
                    mono: data.mono,
                    sessionId: sessionId,
                    time: new Date(time)
                };
                return this.sendToWorker(TOPICS.OUTPUT, messageForOutput);
            })
            .then((res) => {
                console.log('[' + this.workerName + '] sent to output worker === ' + res);
            })
            .catch(err => {
                console.error(err);
            });
    }
}

function differentiateState(deviceId, sessionId, time) {
    return influx.query("SELECT last(band7) FROM band_power " +
        "WHERE time > now() - 3h AND deviceId = '" + deviceId + "' " +
        "AND sessionId = '" + sessionId + "' LIMIT 100")
        .then(item => {
            // let count = data.length;

            let mono = 0;
            let pen = 0;
            let stable = 0;
            // let middleBand = (item['band6'] + item['band7']) / 2;
            let middleBand = item[0].last;

            if (middleBand > 8) {
                pen++;
            } else if (middleBand < 0.4) {
                mono++;
            } else {
                stable++;
            }

            let result = {
                pen: pen,
                stable: stable,
                mono: mono,
                time: item[0].time
            }

            return new Promise(resolve => {resolve(result)});
        });
}

let worker = new SimpleCalcWorker();

worker.start();