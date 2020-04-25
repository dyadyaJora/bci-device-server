const Influx = require('influx');
const INFLUX_HOST = 'localhost';
const DB_NAME = 'vr_data_test';
const influx = new Influx.InfluxDB({
    host: INFLUX_HOST,
    database: DB_NAME
});

function calculateIndexStress(data) {
    data.sort(sortByNumberAsc);
    console.log('all is OK!');
    return 1;
}

function getLastPoints(deviceId, sessionId) {
    return influx.query("SELECT * FROM autogen.sensor " +
        "WHERE " + /*"time > now() - 5m AND" +*/ "deviceId = '" + deviceId +"' " + "AND sessionId = '" + sessionId + "' " +
        "ORDER BY time DESC " +
        "LIMIT 300");
}

function findSpaces(data, deviceId, sessionId) {
    data.sort(sortByNumberAsc);

    let filteredData = [];
    let peeks = [];
    let prmcs = [];

    if (!!data[0]) {
        filteredData.push(data[0]);
    }

    for (let i = 1; i < data.length; i++) {
        if (data[i-1].number === null) {
            continue;
        }

        if (data[i-1].number === data[i].number - 1) {
            filteredData.push(data[i]);
            continue;
        }

        if (data[i-1].number < data[i].number - 1) {
            let dataForRestore = restore(data[i-1], data[i]);
            filteredData = filteredData.concat(dataForRestore);
            prmcs.push(saveRestored(dataForRestore, deviceId, sessionId));
            continue;
        }

        if (data[i-1].number === data[i].number) {
            if (!data[i].restored) {
                filteredData.push(data[i]);
            } else if (!data[i-1].restored) {
                filteredData.push(data[i-1]);
            }
        }
    }

    console.log("filteredData ===", filteredData);
    return Promise.all(prmcs);
    // return filteredData;
}

function restore(pointA, pointB) {
    let numberA = pointA.number;
    let numberB = pointB.number;

    let timestampIter = +pointA.time;
    let avgSignal = Math.abs(+pointA.analog - +pointB.analog) / Math.abs(numberA - numberB);
    let avg = Math.round(Math.abs(+pointA.time - +pointB.time) / Math.abs(numberA - numberB));

    restored = [];
    for (let i = numberA + 1; i < numberB; i++) {
        timestampIter += avg;
        let point = {
            number: i,
            analog: avgSignal,
            peek: avg,
            valid: 1,
            pulse: pointA.pulse,
            timestamp: timestampIter,
            restored: true
        };
        restored.push(point);
    }

    return restored;
}

function saveRestored(restored, measurement, deviceId, sessionId) {
    let forSave = restored.map(item => {
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
                number: +item.number,
                restored: item.restored
            },
            timestamp: item.timestamp + "000000"
        }
    });

    return influx.writePoints(forSave);
}

function saveIndexStress(indexValue, time, deviceId, sessionId) {
    let point = {
        measurement: 'stress_index',
        tags: {
            deviceId: deviceId,
            sessionId: sessionId
        },
        fields: {
            index: indexValue
        },
        timestamp: time
    }
    return influx.writePoints([point]);
}

function sortByNumberAsc(a, b) {
    if (a.number === b.number)
        return 0;

    if (a.number > b.number)
        return 1;
    else
        return -1;
}

function main(deviceId, sessionId) {
    return getLastPoints(deviceId, sessionId)
        .then(data => {
            console.log(data);
            return findSpaces(data, deviceId, sessionId);
        })
        .then((results) => {
            return getLastPoints(deviceId, sessionId)
        })
        .then(data => {
            let indexStress = calculateIndexStress(data);
            let lastTime = data[data.length - 1].time;
            return saveIndexStress(indexStress, lastTime, deviceId, sessionId);
        });
}

module.exports = {
    calculateIndexStress,
    main
};