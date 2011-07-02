var Stream = require('stream').Stream;
var util = require('util');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;

module.exports = WireReader;

function WireReader() {
  this.writable = true;
  
  this._header = new Buffer(16);
  this._message = null;
  this._buffer = null;
  this._size = 0;
  this._marker = 0;
}
util.inherits(WireReader, Stream);

WireReader.prototype.write = function (buffer) {
  while (true) {
    // write header
    if (this._size < 16) {
      var end = Math.min(buffer.length, 16 - this._size);
      buffer.copy(this._header, this._size, 0, end);
      this._size += end;
      if (this._size === 16) {
        // header complete; setup the new message
        this._message = decodeHeader(this._header);
        this._buffer = new Buffer(this._message.messageLength);
        this._header.copy(this._buffer);
        this._marker = 16;
      }
      if (buffer.length === end) {
        break;  // buffer exhausted
      }
      buffer = buffer.slice(end);
    }
    
    // write body
    var needed = Math.min(buffer.length, this._buffer.length - this._size);
    buffer.copy(this._buffer, this._size, 0, needed);
    this._size += buffer.length;
    if (this._size < this._buffer.length) {
      break;  // buffer exhausted
    }
    
    // body complete; decode, emit and reset
    decodeBody.call(this);
    this.emit('message', this._message, this._buffer);
    this._message = this._buffer = null;
    this._size = 0;
    
    if (needed === buffer.length) {
      break;  // buffer exhausted
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

function decodeHeader(buffer) {
  var header = {
    messageLength : BinaryParser.toInt(buffer.toString('binary',  0,  4)),
    requestID     : BinaryParser.toInt(buffer.toString('binary',  4,  8)),
    responseTo    : BinaryParser.toInt(buffer.toString('binary',  8, 12)),
    opCode        : BinaryParser.toInt(buffer.toString('binary', 12, 16))
  };
  if (!op_decoders[header.opCode]) {
    throw new Error('Unknown op code, ' + JSON.stringify(header.opCode));
  }
  return header;
};

function decodeBody() {
  var decoder = op_decoders[this._message.opCode];
  decoder.call(this);
};

var op_decoders = {
  2004 : decodeQuery
};

function decodeQuery() {
  this._message.flags              = BinaryParser.toInt(this._consume(4));
  this._message.fullCollectionName = this._cstring();
  this._message.numberToSkip       = BinaryParser.toInt(this._consume(4));
  this._message.numberToReturn     = BinaryParser.toInt(this._consume(4));
  this._message.query              = this._bsonObject();
};
