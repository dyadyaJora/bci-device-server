const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const DB_NAME = 'psy-dev-january';
let db;
let res = {};
MongoClient.connect(url)
    .then(client => { // <- db as first argument
        // console.log(db)
        db = client.db(DB_NAME);

        let requests = []
        let startDate = new Date("2019-04-01");
        let endDate = new Date("2019-04-02");
        for (let i = 0; i < 4; i++) {
            let sansRequest = prepareRequest('sans', addDays(startDate, i), addDays(endDate, i));
            let lushersRequest = prepareRequest('lushers', addDays(startDate, i), addDays(endDate, i));

            requests.push(sansRequest);
            requests.push(lushersRequest);
        }

        return Promise.all(requests);
        // return db.collection('sans').find({}).toArray();
    })
    .then(results => {
        let sans = results.filter((item, i) => { return i % 2 === 0;});
        let lushers = results.filter((item, i) => { return i % 2 === 1;});

        let res = {};
        let total = buildGroupResultByMetaComment(sans, {});
        total = buildGroupResultByMetaComment(sans, total);

        console.log(total);
        console.log("TOTAL COUNT",  Object.keys(total).length);
        let totalAgg = {};
        Object.keys(total).forEach(key => {
            totalAgg[key.toUpperCase()] = total[key];
        });

        console.log("TOTAL WITH CASE COUNT",  Object.keys(totalAgg).length);

    })
    .catch((err) => {
        console.log(err);
    })

function addDays(date, days) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function buildGroupResultByMetaComment(arr, res) {
    arr.forEach(item => {
        let data = item;//.filter(item => item.count === 3);
        data.forEach(item => {
            res[item._id] = !!res[item._id] ? res[item._id] + 1 : 1
        });
        console.log(data, " ===== sansData, count: " + data.length);
    });

    return res;
}

function prepareRequest(collectionName, start, end) {
    return db.collection(collectionName)
        .aggregate([
            {
                $match: {
                    "createdAt": {$gte: start, $lt: end }
                }
            },
            {
                $group: {
                    _id: {
                        $toUpper: "$meta.comment"
                    },
                    count: {
                        $sum: 1
                    }
                }
            }
        ]).toArray();
}