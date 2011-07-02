var Stream = require('stream').Stream;
var util = require('util');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;

module.exports = WireReader;

function WireReader() {
  this.writable = true;
  
  this._header = new Buffer(16);
  this._buffer = null;
  this._size = 0;
  this._marker = 0;
  this._message = null;
}
util.inherits(WireReader, Stream);

WireReader.prototype.write = function (buffer) {
  while (true) {
    // header
    if (this._size < 16) {
      var end = Math.min(buffer.length, 16 - this._size);
      buffer.copy(this._header, this._size, 0, end);
      this._size += end;
      if (this._size === 16) {
        // header complete; setup the new message
        this._parseHeader();
        this._buffer = new Buffer(this._message.messageLength);
        this._header.copy(this._buffer);
        this._marker = 16;
      }
      buffer = buffer.slice(end);
    }
    
    // body
    var needed = this._buffer.length - this._size;
    buffer.copy(this._buffer, this._size, 0, needed);
    this._size += buffer.length;
    if (this._size < this._buffer.length) {
      // buffer exhausted but still doesn't complete the message
      break;
    }
    
    // body complete; parse, emit and reset
    this._parseBody();
    this.emit('message', this._message, this._buffer);
    this._size = 0;
    
    if (needed === buffer.length) {
      // buffer exhausted
      break;
    }
    buffer = buffer.slice(needed);
  }
};

WireReader.prototype._consume = function(size) {
  var result = this._buffer.toString('binary', this._marker, this._marker + size);
  this._marker += size;
  return result;
};

WireReader.prototype._cstring = function() {
  var end = this._marker;
  while (this._buffer[end] !== 0 && end < this._buffer.length) {
    end++;
  }
  if (end === this._buffer.length) {
    throw new Error('Unterminated cstring');
  }
  var result = this._buffer.toString('utf8', this._marker, end);
  this._marker = end + 1;
  return result;
};

WireReader.prototype._bsonObject = function() {
  var bson_raw = this._consume(4);
  var bson_len = BinaryParser.toInt(bson_raw);
  bson_raw += this._consume(bson_len - 4);
  return BSON.deserialize(bson_raw);
};

WireReader.prototype._parseHeader = function() {
  this._message = {
    messageLength : BinaryParser.toInt(this._header.toString('binary',  0,  4)),
    requestID     : BinaryParser.toInt(this._header.toString('binary',  4,  8)),
    responseTo    : BinaryParser.toInt(this._header.toString('binary',  8, 12)),
    opCode        : BinaryParser.toInt(this._header.toString('binary', 12, 16))
  };
  if (!op_parsers[this._message.opCode]) {
    throw new Error('Unknown op code, ' + JSON.stringify(this._message.header.opCode));
  }
};

WireReader.prototype._parseBody = function () {
  var parser = op_parsers[this._message.opCode];
  parser.call(this);
};

var op_parsers = {
  2004 : _parseQuery
};

function _parseQuery() {
  this._message.flags              = BinaryParser.toInt(this._consume(4));
  this._message.fullCollectionName = BinaryParser.decode_utf8(this._cstring(20));
  this._message.numberToSkip       = BinaryParser.toInt(this._consume(4));
  this._message.numberToReturn     = BinaryParser.toInt(this._consume(4));
  this._message.query              = this._bsonObject();
};
