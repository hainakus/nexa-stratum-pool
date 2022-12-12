var net = require('net');
var events = require('events');

var multiHashing = require('multi-hashing');

var algorithms = ['sha256','quark', 'x11', 'scrypt', 'scryptn', 'keccak', 'bcrypt', 'skein', 'blake'];

var data = new Buffer("7000000001e980924e4e1109230383e66d62945ff8e749903bea4336755c00000000000051928aff1b4d72416173a8c3948159a09a73ac3bb556aa6bfbcad1a85da7f4c1d13350531e24031b939b9e2b", "hex");



var pool = require('./pool.js');

exports.daemon = require('./daemon.js');
exports.varDiff = require('./varDiff.js');


exports.createPool = function(poolOptions, authorizeFn){
    var newPool = new pool(poolOptions, authorizeFn);
    return newPool;
};
