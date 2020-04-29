const fs = require('fs');
const stream = require('stream');
const Transform = require('stream').Transform;
const es = require('event-stream');

class toCsv extends Transform {
    constructor() {
        super();
    }

    _transform(chunk, encoding, callback) {
        let tmp = chunk.toString("utf8");
        let lineCsv = tmp.split(",")
            .map((ell) => { return ell;})
            .join(",", "utf8");
        this.push(lineCsv + "\n");
        callback();
    }
}

const src = fs.createReadStream('./itmo_eskal.csv');
let writeStream = fs.createWriteStream('./output.csv');

src.pipe(new toCsv())
    .pipe(writeStream);