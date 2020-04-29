const fs = require('fs');
const es = require('event-stream');

const readable = fs.createReadStream('./itmo_eskal.csv');
const writable = fs.createWriteStream('./output.csv');

readable
    .pipe(es.split())
    .pipe(es.mapSync(data => {
        let tmp;
        if (data.startsWith("Fam")) {
            tmp = data.toUpperCase()
                .split(':');
            tmp.unshift("ID", "UG_V5_SIT_TYPE", "UG_V5_REAL_TYPE");
            return tmp.join(":");
        }
        if (!data.toString()) {
            return "";
        }
        tmp = data.toUpperCase().split(':');
        let id = tmp[2] + "_" + tmp[1];
        let ugV5SitType = chooseType(+(tmp[21].toString().replace(",", ".")));
        let ugV5RealType = chooseType(+(tmp[22].toString().replace(",", ".")));
        tmp.unshift(id, ugV5SitType, ugV5RealType);
        return tmp.join(":");
    }))
    .pipe(es.join('\n'))
    .pipe(writable);

function chooseType(ug) {
    return Math.floor((((+ug + 15) / 30) % 12) + 1);
}
