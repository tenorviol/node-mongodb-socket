var net = require('net');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;
var WireReader = require('./WireReader');
var WireWriter = require('./WireWriter');

exports.createServer = createServer;

function createServer(callback) {
  var server = net.createServer(function (socket) {
    var reader = new WireReader();
    var writer = new WireWriter();
    reader.on('message', function (message) {
      var res = new SocketResponse(writer, message);
      callback(message, res);
    });
    socket.pipe(reader);
    writer.pipe(socket);
    
    socket.on('end', function () {
      console.log('socket end');
    });
  });
  server.on('end', function () {
    console.log('server end');
  });
  return server;
}

function SocketResponse(writer, message) {
  this.writer = writer;
  this.message = message;
}

SocketResponse.prototype = {
  reply : function (message) {
    if (!message.responseTo) {
      message.responseTo = this.message.requestID || 0;
    }
    message.opCode = 1;
    if (!message.flags) {
      message.flags = 8;
    }
    if (!message.cursorID) {
      message.cursorID = this.message.cursorID || 0;
    }
    this.writer.write(message);
  }
};
