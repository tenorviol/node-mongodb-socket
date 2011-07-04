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

function int32(value) {
  return BinaryParser.fromInt(value);
}

function int64(value) {
  return BinaryParser.fromLong(value);
}

function cstring(value) {
  return BinaryParser.encode_cstring(value);
}

function encodeMessage(message, command) {
  var length = 16 + command.length;
  var buffer = new Buffer(length);
  buffer.write(int32(length), 0, 'binary');
  buffer.write(int32(message.requestID),  4, 'binary');
  buffer.write(int32(message.responseTo), 8, 'binary');
  buffer.write(int32(message.opCode),    12, 'binary');
  buffer.write(command, 16, 'binary');
  return buffer;
}

var op_encoders = {
  1 : encodeReply,
  1000 : encodeMsg,
  2001 : encodeUpdate,
  2002 : encodeInsert,
  2004 : encodeQuery,
  2005 : encodeGetMore,
  2006 : encodeDelete,
  2007 : encodeKillCursors
};

function encodeReply(reply) {
  var command
    = int32(reply.flags)
    + int64(reply.cursorID)
    + int32(reply.startingFrom)
    + int32(reply.documents ? reply.documents.length : 0);
  if (reply.documents) {
    reply.documents.forEach(function (doc) {
      command += BSON.serialize(doc);
    });
  }
  return encodeMessage(reply, command);
}

function encodeMsg(message) {
  var command = cstring(message.message);
  return encodeMessage(message, command);
}

function encodeUpdate(message) {
  var command
    = int32(0)
    + cstring(message.collection)
    + int32(message.flags)
    + BSON.serialize(message.selector)
    + BSON.serialize(message.update);
  return encodeMessage(message, command);
}

function encodeInsert(message) {
  var command
    = int32(message.flags)
    + cstring(message.collection);
  message.documents.forEach(function (doc) {
    command += BSON.serialize(doc);
  });
  return encodeMessage(message, command);
}

function encodeQuery(message) {
  var command
    = int32(message.flags)
    + cstring(message.collection)
    + int32(message.numberToSkip)
    + int32(message.numberToReturn)
    + BSON.serialize(message.query);
  if (message.fields) {
    command += BSON.serialize(message.fields);
  }
  return encodeMessage(message, command);
}

function encodeGetMore(message) {
  var command
    = int32(0)
    + cstring(message.collection)
    + int32(message.numberToReturn)
    + int64(message.cursorID);
  return encodeMessage(message, command);
}

function encodeDelete(message) {
  var command
    = int32(0)
    + cstring(message.collection)
    + int32(message.flags)
    + BSON.serialize(message.selector);
  return encodeMessage(message, command);
}

function encodeKillCursors(message) {
  var command
    = int32(0)
    + int32(message.cursorIDs.count);
  message.cursorIDs.count.forEach(function (cursorID) {
    command += int64(cursorID);
  });
  return encodeMessage(message, command);
}
