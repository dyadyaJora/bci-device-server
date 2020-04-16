const mongoose = require('mongoose');
const argon2 = require('argon2');
const crypto = require('crypto');

const schema = new mongoose.Schema({
  hash: {
    type: String,
    unique: true
  },
  type: {
    type: String,
    default: ''
  }
});

schema.statics.create = async function (type) {
  const generated = crypto.randomBytes(8).toString('hex');
  const hashed = await argon2.hash(generated);
  const data = { type, hash: hashed };
  const device = new Device(data);

  await device.save();
  device.generated = generated;

  return device;
};

const Device = mongoose.model('Device', schema);

module.exports = Device;