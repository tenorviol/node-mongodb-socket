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
  2004 : encodeQuery
};

function encodeQuery(query) {
  var command
    = BinaryParser.fromInt(query.flags)
    + BinaryParser.encode_cstring(query.fullCollectionName)
    + BinaryParser.fromInt(query.numberToSkip)
    + BinaryParser.fromInt(query.numberToReturn)
    + BSON.serialize(query.query);
  
  var length = 16 + command.length;
  var buffer = new Buffer(length);
  query.messageLength = length;
  writeHeader(query, buffer);
  buffer.write(command, 16, 'binary');
  
  return buffer;
}

function writeHeader(header, buffer) {
  buffer.write(BinaryParser.fromInt(header.messageLength), 0, 'binary');
  buffer.write(BinaryParser.fromInt(header.requestID),     4, 'binary');
  buffer.write(BinaryParser.fromInt(header.responseTo),    8, 'binary');
  buffer.write(BinaryParser.fromInt(header.opCode),       12, 'binary');
}
