var net = require('net');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;
var WireReader = require('./WireReader');

exports.createServer = createServer;

function createServer(callback) {
  var server = net.createServer(function (socket) {
    var reader = new WireReader();
    reader.on('message', function (msg) {
      console.log(msg);
    });
    socket.pipe(reader);
    
    socket.on('end', function () {
      console.log('socket end');
    });
  });
  return server;
}
