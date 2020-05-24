const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config.json');
const Influx = require('influx');
const mongoose = require('mongoose');
const inService = require('./controllers/in-service');
const sessionService = require('./controllers/session-service');
const Memcached = require('memcached');
const { PythonShell } = require('python-shell');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

const PORT = config.server.port;
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});
const memcached = new Memcached(config.memcached.host + ':' + config.memcached.port);
const MONGO_URL = "mongodb://localhost:27017/diplom-dev";

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.post('/api/v1/sensor/bci', function(req, res) {
    let dataArr = req.body.data;
    let deviceId = req.body.deviceId;
    let sessionId = req.body.sessionId;
    console.log("DATA received, batch size: " + dataArr.length);

    ifxFormat = dataArr.map(item => {
        let fieldsObj = {};
        for (let i = 0; i < 8; i++) {
            fieldsObj["ch" + i] = item.channelData[i];
        }
        return {
            measurement: 'bci_sensor',
            tags: {
                deviceId: deviceId,
                sessionId: sessionId
            },
            fields: fieldsObj,
            timestamp: item.timestamp + "000000"
        }
    });

    influx.writePoints(ifxFormat)
        .then(ok => {
            res.send(204);
        })
        .catch( err => {
            console.log(err);
            res.send(500);
        })
});

app.post('/api/v1/sensor/pulse', function(req, res) {
    let dataArr = req.body.data;
    let deviceId = req.body.deviceId;
    let sessionId = req.body.sessionId;

    console.log("data === ", dataArr);

    ifxFormat = dataArr.map(item => {
        return {
            measurement: 'sensor',
            tags: {
                deviceId: deviceId,
                sessionId: sessionId
            },
            fields: {
                pulse: +item.pulse,
                valid: +item.valid,
                peek: +item.peek,
                analog: +item.analog,
                number: +item.number
            },
            timestamp: item.timestamp + "000000"
        }
    });

    influx.writePoints(ifxFormat)
        .then(() => {
            let pyOptions = {
                pythonPath: './calculations/venv/bin/python3',
                pythonOptions: ['-W ignore'],
                scriptPath: './calculations',
                args: [sessionId]
            };
            return new Promise((resolve, reject) => {
                PythonShell.run('calc_rr.py', pyOptions, function (err, results) {
                    if (err) {
                        reject(err);
                    }
                    console.log('results: %j', results);
                    resolve(results);
                });
            });
        })
        .then(() => {
            res.send(204);
        })
        .catch( err => {
            console.log(err);
            res.send(500);
        })
});

app.post('/api/v1/unity/params', function(req, res) {

    let data = req.body.data;
    let gameId = req.body.gameId;
    console.log("unity params == ", data);

    influx.writePoints([
        {
            measurement: 'game',
            tags: {
                gameId: gameId
            },
            fields: {
                height: data.height,
                speed: data.speed,
                acceleration: data.acceleration,
                fuel: data.fuel,
                mu: data.mu
            },
            timestamp: data.timestamp + "000000"
        }
    ]).then(ok => {
        console.log("ok", ok);
        res.send(204);
    }).catch(err => {
        console.log(err);
        res.send(503);
    });
});

app.post('/api/v1/unity/actions', function(req, res) {
    let data = req.body.data;
    let gameId = req.body.gameId;
    console.log("actions data == ", data);

    influx.writePoints([
        {
            measurement: 'actions',
            tags: {
                gameId: gameId
            },
            fields: {
                action: data.action,
            },
            timestamp: data.timestamp + "000000"
        }
    ]).then(ok => {
        console.log("actions ok", ok);
        res.send(204);
    }).catch(err => {
        console.log(err);
        res.send(503);
    });
});

app.get('/api/v1/device/:deviceId/session/:sessionId', function(req, res) {
    let deviceId = req.params.deviceId;
    let sessionId = req.params.sessionId;

    sessionService.getOrCreateDevice(sessionId, deviceId)
        .then(data => {
           if (!data.session || !data.device) {
               res.sendStatus(403);
               return;
           }

           return new Promise((resolve, reject) => {
               data.session.client = data.device;
               let key = data.session.hash;
               let value = data.session;
               memcached.set(key, value, 0, (err) => {
                   if (!!err) {
                       reject(err);
                       return;
                   }

                   resolve();
               })
           });
        })
        .then(() => {
            console.log("I'M OK!");
            res.send(200);
            // res.redirect("/research?session=" + sessionId + "&device=" + deviceId);
        })
        .catch((err) => {
            console.error(err);
            res.send(503);
        });

    console.log("api GET device/session called with params " + deviceId + " " + sessionId);
});

app.post("/cached/:foo/:bar", (req, res) => {
    let foo = req.params.foo;
    let bar = req.params.bar;

    memcached.set(foo, bar, 10, function (err) {
        if (!!err) {
            console.error(err);
            res.sendStatus(503);
            return;
        }

        res.sendStatus(200);
    });
})

app.get("/cached/:deviceId/:sesssionId", (req, res) => {
    let deviceId = req.params.deviceId;
    let sessionId = req.params.sessionId;

    memcached.touch(sessionId, 10000, function (err) {
        if (!!err) {
            console.log(err);
            return;
        }

        memcached.get(sessionId, function (err, data) {
            console.log(data);
            res.send(data);
        });
    });
});

app.get('/tmp', function(req, res) {
    let deviceId = req.query.deviceId;
    let sessionId = req.query.sessionId;
    inService.main(deviceId, sessionId)
        .then(r => {
            console.log("Calculated index saved!", r);
            res.sendStatus(200);
        })
        .catch(err => {
            console.log("Error processing main data", err);
            res.sendStatus(503);
        })
});

function connectInflux() {
    return influx.getDatabaseNames()
        .then(names => {
            if (!names.includes(DB_NAME)) {
                return influx.createDatabase(DB_NAME);
            }
        })
        // .then(() => {
        //   // http.createServer(app).listen(3000, function () {
        //   //   console.log('Listening on port 3000')
        //   // })
        // })
        .catch(err => {
            console.error(`Error creating Influx database!`)
        });
}

function connectMongo() {
    return mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    });
}

function startServer() {
    app.listen(PORT, function () {
        console.log('Example app listening on port ' + PORT +'!');
    });
}

function start() {
    connectInflux()
        .then(() => {
            console.log("influx connected");
            return connectMongo();
        })
        .then(() => {
            console.log("Mongo connected");
            startServer();
        })
        .catch(err => { console.log("some error", err)})
}

start();