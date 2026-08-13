const jwt = require('jsonwebtoken');
const token = process.argv[2];
console.log(jwt.decode(token));
