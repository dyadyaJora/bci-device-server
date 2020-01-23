const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Influx = require('influx');

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

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/api/v1/sensor', function(req, res) {
    let dataArr = req.body.data;
    let deviceId = req.body.deviceId;

    ifxFormat = dataArr.map(item => {
      return {
        measurement: 'sensor',
        tags: {
          deviceId: deviceId
        },
        fields: {
          pulse: item.pulse,
          valid: item.valid,
          peek: item.peek,
          analog: item.analog
        },
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

app.post('/api/v1/unity/params', function(req, res) {

    res.send(503);
});

app.post('/api/v1/unity/actions', function(req, res) {
    res.send(503);
});

app.listen(PORT, function () {
  console.log('Example app listening on port ' + PORT +'!');
});

influx.getDatabaseNames()
  .then(names => {
    if (!names.includes(DB_NAME)) {
        return influx.createDatabase(DB_NAME);
    }
  })
  .then(() => {
    // http.createServer(app).listen(3000, function () {
    //   console.log('Listening on port 3000')
    // })
  })
  .catch(err => {
    console.error(`Error creating Influx database!`)
  })
