var Stream = require('stream').Stream;
var util = require('util');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;

module.exports = WireReader;

function WireReader() {
  this.writable = true;
  this.buffers = [];
  this.marker = 0;
  this.current = '';
}
util.inherits(WireReader, Stream);

WireReader.prototype.write = function (buffer) {
  this.buffers.push(buffer);
  try {
    this.parse();
  } catch (err) {
    if (err !== 'waiting') {
      // if this is not just a 'wait for it' throw, rethrow
      throw err;
    }
  }
};

WireReader.prototype.consume = function(size) {
  var result = this.current;
  var needed = size - result.length;
  while (needed && this.buffers.length) {
    var buffer = this.buffers[0];
    if (buffer.length - this.marker < needed) {
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
    throw 'waiting';
  }
  
  this.current = '';
  return result;
};

WireReader.prototype.cstring = function() {
  while (this.buffers) {
    var buffer = this.buffers[0];
    var end = this.marker;
    while (buffer[end] !== 0 && end < buffer.length) {
      end++;
    }
    this.current += buffer.toString('binary', this.marker, end);
    if (end === buffer.length) {
      this.buffers.shift();
      this.marker = 0;
    } else {
      this.marker = end + 1;
      var result = this.current;
      this.current = '';
      return result;
    }
  }
  throw 'waiting';
};

WireReader.prototype.bsonObject = function() {
  if (!this.bsonRaw) {
    this.bsonRaw = this.consume(4);
  }
  var bsonSize = BinaryParser.toInt(this.bsonRaw);
  this.bsonRaw += this.consume(bsonSize - 4);
  var result = BSON.deserialize(this.bsonRaw);
  this.bsonRaw = null;
  return result;
};

WireReader.prototype.parse = function () {
  if (!this.message) {
    this.message = { header: {} };
  }
  if (!this.message.header.opCode) {
    this.parseHeader();
  }
  switch (this.message.header.opCode) {
    case 2004:
      this.parseQuery();
      break;
    default:
      throw new Error('Unknown op code, "'+this.message.header.opCode+'"');
  }
  
  this.emit('message', this.message);
  this.message = null;
};

WireReader.prototype.parseHeader = function() {
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

WireReader.prototype.parseQuery = function () {
  if (!this.message.flags) {
    this.message.flags = BinaryParser.toInt(this.consume(4));
  }
  if (!this.message.fullCollectionName) {
    this.message.fullCollectionName = BinaryParser.decode_utf8(this.cstring());
  }
  if (!this.message.numberToSkip) {
    this.message.numberToSkip = BinaryParser.toInt(this.consume(4));
  }
  if (!this.message.numberToReturn) {
    this.message.numberToReturn = BinaryParser.toInt(this.consume(4));
  }
  if (!this.message.query) {
    this.message.query = this.bsonObject();
  }
};
