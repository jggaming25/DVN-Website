const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

module.exports = {
  hashPassword: (pw) => bcrypt.hashSync(pw, SALT_ROUNDS),
  comparePassword: (pw, hash) => bcrypt.compareSync(pw, hash)
};
