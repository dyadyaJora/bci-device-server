const mongoose = require('mongoose');
const Session = require('../models/session');
const Device = require('../models/device');

const MONGO_URL = "mongodb://localhost:27017/diplom-dev";

function connectMongo() {
    return mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    });
}
function getSession(sessionHash) {
    return Session.findOne({ hash: sessionHash })
}

function getDevice(deviceHash) {
    return Device.findOne({ hash: deviceHash});
}

function getOrCreateDevice(sessionHash, deviceHash) {
    let result = {
        session: '',
        device: ''
    }
    return Session.findOneAndUpdate({ hash: sessionHash }, {}, { upsert: true, new: true })
        .then((session) => {
            result['session'] = session;
            return Device.findOneAndUpdate({ hash: deviceHash }, {}, { upsert: true, new: true });
        })
        .then(device => {
            result['device'] = device;
            return new Promise((res, rej) => res(result));
        });
}

function main() {
    connectMongo()
        .then(() => {
            return getOrCreateDevice("test-session-new-12", "test-device-new12");
        })
        .then(ok => {
            console.log(ok, "!");
        })
        .catch(err => console.error(err));
}

module.exports = {
    getSession,
    getDevice,
    getOrCreateDevice
};