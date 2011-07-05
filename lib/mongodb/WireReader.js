var Stream = require('stream').Stream;
var util = require('util');
var BinaryParser = require('mongodb').BinaryParser;
var BSON = require('mongodb').BSONPure.BSON;

module.exports = WireReader;

function WireReader() {
  this.writable = true;
  this._buffer = new MessageBuffer();
}
util.inherits(WireReader, Stream);

WireReader.prototype.write = function (buffer) {
  while (true) {
    var used = this._buffer.write(buffer);
    if (this._buffer.isComplete()) {
      var message = decodeMessage(this._buffer);
      if (this._buffer.rloc !== this._buffer.wloc) {
        throw new Error('Did not use entire buffer');
      }
      this.emit('message', message, this._buffer.buffer);
      this._buffer = new MessageBuffer();
    }
    if (used === buffer.length) {
      break;  // buffer exhausted
    }
    buffer = buffer.slice(used);
  }
};

WireReader.prototype.end = function () {
  this.writable = false;
  this.emit('end');
};

function decodeMessage(buffer) {
  buffer.rloc = 4;  // discard the length
  var message = {
    requestID     : buffer.readInt32(),
    responseTo    : buffer.readInt32(),
    opCode        : buffer.readInt32()
  };
  var decoder = op_decoders[message.opCode];
  if (!decoder) {
    throw new Error('Unknown op code, ' + JSON.stringify(message.opCode));
  }
  decoder.call(message, buffer);
  return message;
}

var op_decoders = {
  1    : decodeReply,
  1000 : decodeMsg,
  2001 : decodeUpdate,
  2002 : decodeInsert,
  2004 : decodeQuery,
  2005 : decodeGetMore,
  2006 : decodeDelete,
  2007 : decodeKillCursors
};

function decodeReply(buffer) {
  this.flags          = buffer.readInt32();
  this.cursorID       = buffer.readInt64();
  this.startingFrom   = buffer.readInt32();
  this.numberReturned = buffer.readInt32();
  this.documents      = [];
  var doc;
  while (doc = buffer.readBsonObject()) {
    this.documents.push(doc);
  }
}

function decodeMsg(buffer) {
  this.message = buffer.readCstring();
}

function decodeUpdate(buffer) {
  buffer.rloc += 4;  // skip ZERO
  this.collection = buffer.readCstring();
  this.flags      = buffer.readInt32();
  this.selector   = buffer.readBsonObject();
  this.update     = buffer.readBsonObject();
}

function decodeInsert(buffer) {
  this.flags      = buffer.readInt32();
  this.collection = buffer.readCstring();
  this.documents  = [];
  var doc;
  while (doc = buffer.readBsonObject()) {
    this.documents.push(doc);
  }
}

function decodeQuery(buffer) {
  this.flags          = buffer.readInt32();
  this.collection     = buffer.readCstring();
  this.numberToSkip   = buffer.readInt32();
  this.numberToReturn = buffer.readInt32();
  this.query          = buffer.readBsonObject();
  var fields = buffer.readBsonObject();
  if (fields) {
    this.fields = fields;
  }
}

function decodeGetMore(buffer) {
  buffer.rloc += 4; // skip ZERO
  this.collection     = buffer.readCstring();
  this.numberToReturn = buffer.readInt32();
  this.cursorID       = buffer.readInt64();
}

function decodeDelete(buffer) {
  buffer.rloc += 4;
  this.collection = buffer.readCstring();
  this.flags      = buffer.readInt32();
  this.selector   = buffer.readBsonObject();
}

function decodeKillCursors(buffer) {
  buffer.rloc += 4;
  var numberOfCursorIDs = buffer.readInt32();
  this.cursorIDs = [];
  for (var i = 0; i < numberOfCursorIds; i++) {
    this.cursorIDs.push(buffer.readInt64());
  }
}

function MessageBuffer() {
  this.buffer = new Buffer(4);
  this.wloc = 0;
  this.rloc = 0;
}

MessageBuffer.prototype = {
  write : function (buffer) {
    var start = this.wloc;
    
    // read message length
    if (this.buffer.length === 4) {
      var need = Math.min(buffer.length, 4 - this.wloc);
      buffer.copy(this.buffer, this.wloc, 0, need);
      this.wloc += need;
      
      // initialize message buffer
      if (this.wloc === 4) {
        var length = this.readInt32();
        if (length <= 4) {
          throw new Error('Message length is too short');
        }
        var temp = new Buffer(length);
        this.buffer.copy(temp);
        this.buffer = temp;
        buffer = buffer.slice(need);
      }
    }
    
    // copy message
    if (this.buffer.length !== 4) {
      var need = Math.min(buffer.length, this.buffer.length - this.wloc);
      buffer.copy(this.buffer, this.wloc, 0, need);
      this.wloc += need;
    }
    
    // return the number of characters used to fill this buffer
    return this.wloc - start;
  },
  
  isComplete : function () {
    return this.buffer && this.wloc === this.buffer.length;
  },
  
  read : function (size) {
    var end = this.rloc + size;
    if (end > this.wloc) {
      throw new Error('Attempting to read past the end of buffer');
    }
    var result = this.buffer.toString('binary', this.rloc, end);
    this.rloc = end;
    return result;
  },

  readInt32 : function () {
    return BinaryParser.toInt(this.read(4));
  },

  readInt64 : function () {
    return BinaryParser.toLong(this.read(8));
  },

  readCstring : function () {
    var end = this.rloc;
    while (this.buffer[end] !== 0 && end < this.buffer.length) {
      end++;
    }
    if (end === this.buffer.length) {
      throw new Error('Unterminated cstring');
    }
    var result = this.buffer.toString('utf8', this.rloc, end);
    this.rloc = end + 1;
    return result;
  },

  readBsonObject : function () {
    if (this.rloc === this.wloc) {
      return null;  // at end of buffer
    }
    var bson_raw = this.read(4);
    var bson_len = BinaryParser.toInt(bson_raw);
    bson_raw += this.read(bson_len - 4);
    return BSON.deserialize(bson_raw);
  }
};
