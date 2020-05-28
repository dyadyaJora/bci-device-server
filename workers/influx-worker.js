const BaseWorker = require('./base-worker');
const { TOPICS } = require('../controllers/kafka-service');
const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});
const config = require('../config.json');
const USED_FREQ = [
    "delta",
    "theta",
    "alpha",
    "beta",
    "gamma"
];

class InputInfluxWorker extends BaseWorker {
    constructor() {
        super(TOPICS.DATA, 'BandPower_Input');
    }

    process(value) {
        Promise.all([this._saveBandPower(value), this._saveBandPowerRel(value)])
            .then(() => {
                console.log('saved');
                let messageForCalc = {
                    sessionId: value.sessionId,
                    deviceId: value.deviceId,
                    type: value.type,
                    time: value.time
                };
                return this.sendToWorker(TOPICS.CALC, messageForCalc);
            })
            .then((res) => {
                console.log('[' + this.workerName + '] sent to output worker === ' + res);
            })
            .catch(err => {
                console.error(err);
            });
    }

    _saveBandPower(value) {
        let points = [];

        let tags = {
            deviceId: value.deviceId,
            sessionId: value.sessionId
        };

        for (let i = 0; i < USED_FREQ.length; i++) {
            let fieldObject = {};
            for (let j = 0; j < value.data.length; j++) {
                fieldObject['band' + j] = value.data[j][i];
            }
            let currentTags = Object.assign({}, tags, { wave: USED_FREQ[i] });
            points.push({
                measurement: 'band_power',
                tags: currentTags,
                fields: fieldObject,
                timestamp: +new Date(value.time) + "000000"
            });
        }

        return influx.writePoints(points);
    }

    _saveBandPowerRel(value) {
        let betaAlfaRels = value.data.map(values => {
            return values[3] / values[2];
        });
        let fieldObject = {};
        betaAlfaRels.forEach((item, i) => {
            fieldObject['band' + i] = item;
        });
        let point = {
            measurement: 'band_power_rel',
            tags: {
                deviceId: value.deviceId,
                sessionId: value.sessionId
            },
            fields: fieldObject,
            timestamp: +new Date(value.time) + "000000"
        }
        return influx.writePoints([point])
    }
}

let worker = new InputInfluxWorker();

worker.start();