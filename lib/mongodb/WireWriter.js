var Stream = require('stream').Stream;
var util = require('util');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;

module.exports = WireWriter;

function WireWriter() {
  this.readable = true;
}
util.inherits(WireWriter, Stream);

WireWriter.prototype.write = function (message) {
  var encoder = op_encoders[message.opCode];
  var buffer = encoder(message);
  this.emit('data', buffer);
};

var op_encoders = {
  1 : encodeReply,
  2004 : encodeQuery
};

function encodeMessage(message, command) {
  var length = 16 + command.length;
  var buffer = new Buffer(length);
  buffer.write(BinaryParser.fromInt(length), 0, 'binary');
  buffer.write(BinaryParser.fromInt(message.requestID),  4, 'binary');
  buffer.write(BinaryParser.fromInt(message.responseTo), 8, 'binary');
  buffer.write(BinaryParser.fromInt(message.opCode),    12, 'binary');
  buffer.write(command, 16, 'binary');
  return buffer;
}

function encodeQuery(query) {
  var command
    = BinaryParser.fromInt(query.flags)
    + BinaryParser.encode_cstring(query.fullCollectionName)
    + BinaryParser.fromInt(query.numberToSkip)
    + BinaryParser.fromInt(query.numberToReturn)
    + BSON.serialize(query.query);
  
  if (query.returnFieldSelector) {
    command += BSON.serialize(query.returnFieldSelector);
  }
  
  return encodeMessage(query, command);
}

function encodeReply(reply) {
  
}
