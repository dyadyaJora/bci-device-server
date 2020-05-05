const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
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

let start = new Date("2019-04-04");
let end = new Date("2019-04-05");

const VALUE = "anxiety";

let mongoClient;

let content = fs.readFileSync("./output.csv");
let idMap = prepareV5Map(content);

connectInflux(INFLUX_DB_NAME).then(() => {
    return MongoClient.connect(url)
})
    .then(client => {
        mongoClient = client;
        db = client.db(DB_NAME);
        return db.collection('lushers').aggregate([{ $match: {
            "createdAt": { $gte: start, $lt: end }
        }},{$group: {_id: { $toUpper: "$meta.comment"}, count: {$sum: 1}, ids: { $push: "$_id" } }}]).toArray();
    })
    .then(data => {
        let aggRes = {};
        data.map(item => {
            let id = getCorrectId(item._id);
            if (!!aggRes[id]) {
                aggRes[id].sum += item.count;
                aggRes[id].ids = aggRes[id].ids.concat(item.ids);
            } else {
                aggRes[id] = {};
                aggRes[id].sum = item.count;
                aggRes[id].ids = item.ids;
            }
        })

        let keys = Object.keys(aggRes).filter(key => aggRes[key].sum === 3);
        let promises = keys.map(key => {
            db = mongoClient.db(DB_NAME);
            return db.collection('lushers').find({_id: { $in: aggRes[key].ids } }).sort({ createdAt: 1 }).toArray();
        });
        console.log(keys.length);

        return Promise.all(promises);
    })
    .then(all => {
        console.log(all);
        let rows = prepareLusherRowDelta(all);
        fs.appendFileSync("./method2_delta/Люшер_" + VALUE + "_.csv", rows);
    })
    // .then(() => {
    //     db = mongoClient.db(DB_NAME);
    //     return db.collection('sans').find({
    //         "createdAt": { $gte: start, $lt: end }
    //     }).toArray();
    // })
    // .then(data => {
    //     return saveToInfluxSan(data)
    // })
    // .then(() => {
    //     console.log("SAVED to influx")
    // })
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
                group: !!idMap[id]? idMap[id].v5 : '-1'
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
                group: !!idMap[id]? idMap[id].v5 : '-1',
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
        if (!tmp[2])
            return;
        let itemId = getCorrectId(tmp[2]);
        res[itemId + "_" + tmp[1]] = {
            v5: tmp[30]
        }
    });

    return res;
}

function chooseType(ug) {
    return Math.floor((((+ug + 15) / 30) % 12) + 1);
}

function prepareLusherRow(arr) {
    let rows = '';
    arr.forEach(items => {
        let itemId = getCorrectId(items[0].meta.comment);
        let groupV5 = !!idMap[itemId]? idMap[itemId].v5 : '-1';
        rows += groupV5 + "," + itemId + "," + items.map(item => Math.round(item.points[VALUE].percent)).join(",") + "\n";
    });
    return rows;
}

function prepareLusherRowDelta(arr) {
    let rows = '';
    arr.forEach(items => {
        let itemId = getCorrectId(items[0].meta.comment);
        let groupV5 = !!idMap[itemId]? idMap[itemId].v5 : '-1'
        let delta1 = Math.round(items[1].points[VALUE].percent) - Math.round(items[0].points[VALUE].percent);
        let delta2 = Math.round(items[2].points[VALUE].percent) - Math.round(items[1].points[VALUE].percent);;
        let delta3 = Math.round(items[2].points[VALUE].percent) - Math.round(items[0].points[VALUE].percent);

        rows += groupV5 + "," + itemId + "," + delta1 + "," + delta2 + "," + delta3 + "\n";
    });
    return rows;
}