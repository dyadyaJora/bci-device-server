const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function main(arr) {
    arr = []
    for (let i = 0; i < 20; i++) {
        arr.push(Math.sin(i * Math.PI/20) + Math.sin(i * Math.PI/20));
    }
    arr = arr.map(item => item+= 1000);
    let param = arr.join(" ");
    const { stdout, stderr } = await exec('python3 ./calculations/lab3.py --data="' + param + '"');

    if (stderr) {
        console.error(`error: ${stderr}`);
    }
    console.log(`Number of files ${stdout}`);
}

main().then(d => console.log("data", d));

