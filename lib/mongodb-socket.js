var net = require('net');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;

exports.createServer = createServer;

function createServer(callback) {
  var server = net.createServer(function (socket) {
    console.log('Opening!!!');
    socket.setEncoding('binary');
    
    socket.on('data', function (data) {
      console.log(parseMessage(data));
    });
    
    socket.on('end', function () {
      console.log('socket end');
    });
  });
  return server;
}


function parseMessage(data) {
  var message = {};
  
  var offset = 0;
  var header = message.header = parseHeader(data, offset);
  offset += 16;
  
  switch (header.opCode) {
    case 2004:
      return parseQuery(message, data, offset);
  }
  
  return message;
}

function parseHeader(data, offset) {
  var header = {};
  header.messageLength = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  header.requestID = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  header.responseTo = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  header.opCode = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  return header;
}

function parseQuery(message, data, offset) {
  message.flags = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  message.fullCollectionName = parseCstring(data, offset);
  offset += message.fullCollectionName.length + 1;
  message.numberToSkip = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  message.numberToReturn = BinaryParser.toInt(data.substr(offset, 4));
  offset += 4;
  var bsonObjectSize = BinaryParser.toInt(data.substr(offset, 4));
  message.query = BSON.deserialize(data.substr(offset, bsonObjectSize));
  return message;
}

function parseCstring(data, offset) {
  var end = data.indexOf('\0', offset);
  if (end === -1) {
    throw new Error('No cstring termination');
  }
  return data.substr(offset, end - offset);
}
