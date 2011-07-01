var Stream = require('stream').Stream;
var util = require('util');

module.exports = MongoStream;

function MongoStream() {
  this.writable = true;
  this.buffers = [];
  this.marker = 0;
  this.current = '';
}
util.inherits(MongoStream, Stream);

MongoStream.prototype.write = function (buffer) {
  this.buffers.push(buffer);
  try {
    this.parse();
  } catch (err) {
    console.log(err.stack);
    console.log('waiting');
  }
};

MongoStream.prototype.consume = function(size) {
  var result = this.current;
  var needed = size - result.length;
  console.log('ho');
  while (needed && this.buffers.length) {
    var buffer = this.buffers[0];
    if (buffer.length - this.marker > needed) {
      result += buffer.toString('binary', this.marker);
      this.buffers.shift();
      this.marker = 0;
    } else {
      result += buffer.toString('binary', this.marker, this.marker + needed);
      this.marker += needed;
    }
    needed = size - result.length;
  }
  
  if (needed) {
    this.current = result;
    //throw new Error('waiting');
  }
  
  this.current = '';
  return result;
};

var STATE_HEADER = 0;
var STATE_REQUEST_ID = 1;
var STATE_RESPONSE_TO = 2;
var STATE_OP_CODE = 3;

MongoStream.prototype.parse = function () {
  if (!this.message) {
    this.message = { header: {} };
  }
  if (!this.message.header.opCode) {
    this.parseHeader();
  }
  
  this.emit('message', this.message);
  this.message = null;
};

MongoStream.prototype.parseHeader = function() {
  if (!this.message.header.messageLength) {
    this.message.header.messageLength = BinaryParser.toInt(this.consume(4));
  }
  if (!this.message.header.requestID) {
    this.message.header.requestID = BinaryParser.toInt(this.consume(4));
  }
  if (!this.message.header.responseTo) {
    this.message.header.responseTo = BinaryParser.toInt(this.consume(4));
  }
  if (!this.message.header.opCode) {
    this.message.header.opCode = BinaryParser.toInt(this.consume(4));
  }
};

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
