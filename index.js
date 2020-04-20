const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Influx = require('influx');
const mongoose = require('mongoose');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

const PORT = 3001;
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});
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

app.post('/api/v1/sensor', function(req, res) {
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
                analog: +item.analog
            },
            timestamp: item.timestamp + "000000"
        }
    });

    rrFormat = [];
    for (let i = 0; i < dataArr.length - 1; i++) {
        let peek;
        if (!dataArr[i].valid) {
            peek = 0;
        }
        if (dataArr[i].peek < dataArr[i+1].peek)  {
            if (dataArr[i] === 0) {
                peek = dataArr[i].timestamp;
            } else {
                peek = (dataArr[i].timestamp + dataArr[i+1].timestamp) / 2;
            }
        } else {
            continue;
        }

        rrFormat.add({
            measurement: 'rr',
            tags: {
                deviceId: deviceId,
                sessionId: sessionId
            },
            fields: {
                peek: 1
            },
            timestamp: item.timestamp + "000000"
        });
    }

    influx.writePoints(ifxFormat)
        .then(ok => {
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
    console.log("api GET device/session called");
    res.sendStatus(200);
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
        useCreateIndex: true
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