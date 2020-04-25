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
  },
  info: {
    type: String,
    default: ''
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  }
});

schema.statics.create = async function (type) {
  const generated = crypto.randomBytes(8).toString('hex');
  const hashed = await argon2.hash(generated);
  const data = { type, hash: hashed };
  const session = new Session(data);

  await session.save();
  session.generated = generated;

  return session;
};

const Session = mongoose.model('Session', schema);

module.exports = Session;