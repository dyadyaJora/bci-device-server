const mongoose = require('mongoose');
const Session = require('../models/session');
const Device = require('../models/device');

const MONGO_URL = "mongodb://localhost:27017/diplom-dev";

function connectMongo() {
    return mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: true
    });
}
function getSession(sessionHash) {
    return Session.findOne({ hash: sessionHash })
}

function getDevice(deviceHash) {
    return Device.findOne({ hash: deviceHash});
}

function getOrCreateDevice(sessionHash, deviceHash) {
    return Session.findOneAndUpdate({ hash: sessionHash }, {}, { upsert: true })
        .then((session) => {
            if (!session) {
                console.log("Session created!");
            } else {
                console.log(session, "== session");
            }
            return Device.findOneAndUpdate({ hash: deviceHash }, {}, { upsert: true });
        })
        .then(device => {
            if (!device) {
                console.log("device created");
            } else {
                console.log(device, "== device");
            }
            return new Promise((res, rej) => res("I'am OK!"));
        });
}

function main() {
    connectMongo()
        .then(() => {
            return getOrCreateDevice("test-session2", "test-device");
        })
        .then(ok => {
            console.log(ok, "!");
        })
        .catch(err => console.error(err));
}

main();

module.exports = {
    getSession,
    getDevice,
    getOrCreateDevice
};