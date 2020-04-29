const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const Influx = require('influx');
const url = 'mongodb://localhost:27017';
const DB_NAME = 'psy-dev-january';
let db;
let res = {};

const INFLUX_HOST = 'localhost';
const INFLUX_DB_NAME = 'psy_research';
const INFLUX_USER = '';
const INFLUX_PASS = '';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: INFLUX_DB_NAME,
    username: INFLUX_USER,
    password: INFLUX_PASS
});

let start = new Date("2019-04-01");
let end = new Date("2019-04-05");

let mongoClient;

let content = fs.readFileSync("./output.csv");
let idMap = prepareV5Map(content);

connectInflux(INFLUX_DB_NAME).then(() => {
        return MongoClient.connect(url)
    })
    .then(client => {
        mongoClient = client;
        db = client.db(DB_NAME);
        return db.collection('lushers').find({
            "createdAt": { $gte: start, $lt: end }
        }).toArray();
    })
    .then(data => {
        return saveToInfluxLusher(data)
    })
    .then(() => {
        db = mongoClient.db(DB_NAME);
        return db.collection('sans').find({
            "createdAt": { $gte: start, $lt: end }
        }).toArray();
    })
    .then(data => {
        return saveToInfluxSan(data)
    })
    .then(() => {
        console.log("SAVED to influx")
    })
    .catch(err => console.error(err))

function connectInflux(influxDbName) {
    return influx.getDatabaseNames()
        .then(names => {
            if (!names.includes(influxDbName)) {
                return influx.createDatabase(influxDbName);
            }
        })
        .then(() => {
            return influx.createRetentionPolicy('forever', {
                duration: '0s',
                replication: 1,
                isDefault: true
            })
        });
}

function saveToInfluxLusher(data) {
    data = data.filter(dataMetaFilter).map(item => {
        let id = getCorrectId(item.meta.comment);
        return {
            measurement: 'lusher_v5',
            tags: {
                comment: id,
                ug_v5_sit_type: !!idMap[id]? idMap[id].v5_sit : '-1',
                ug_v5_real_type: !!idMap[id]? idMap[id].v5_real : '-1'
            },
            fields: {
                anxiety: item.points.anxiety.percent,
                performance: item.points.performance.percent,
                fatigue: item.points.fatigue.percent
            },
            timestamp: +item.createdAt + "000000"
        };
    })
    return influx.writePoints(data)
}

function saveToInfluxSan(data) {
    data = data.filter(dataMetaFilter).map(item => {
        let id = getCorrectId(item.meta.comment);
        return {
            measurement: 'san_v5',
            tags: {
                comment: id,
                ug_v5_sit_type: !!idMap[id]? idMap[id].v5_sit : '-1',
                ug_v5_real_type: !!idMap[id]? idMap[id].v5_real : '-1'
            },
            fields: {
                a: item.points.a,
                s: item.points.s,
                n: item.points.n
            },
            timestamp: +item.createdAt + "000000"
        };
    });
    return influx.writePoints(data)
}

function dataMetaFilter(item) {
    if (!item)
        return false;

    if (!item.meta)
        return false;

    return item.meta.comment;
}

function getCorrectId(id) {
    id = id.split(' ')[0].toUpperCase();
    id = id.replace("4К4Ф", "4Ф4К");
    return id;
}

function prepareV5Map(content) {
    res = {};
    content.toString().split('\n').forEach(item => {
        let tmp = item.split(':');
        res[tmp[0]] = {
            v5_sit: tmp[1],
            v5_real: tmp[2]
        }
    });

    return res;
}