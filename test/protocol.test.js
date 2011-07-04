var WireReader = require('../lib/mongodb/WireReader');
var WireWriter = require('../lib/mongodb/WireWriter');
var mongodb = require('mongodb');
var ObjectID = require('mongodb').BSONPure.ObjectID;

var tests = [

  {
    buffer : new Buffer([
      0x3a, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0xd4, 0x07, 0, 0,
      0, 0, 0, 0,
      0x61, 0x64, 0x6d, 0x69, 0x6e, 0x2e, 0x24, 0x63, 0x6d, 0x64, 0,
      0, 0, 0, 0,
      0xff, 0xff, 0xff, 0xff,
      0x13, 0, 0, 0,
      0x10, 0x69, 0x73, 0x6d, 0x61, 0x73, 0x74, 0x65, 0x72, 0, 0x01, 0, 0, 0, 0
    ]),
    message : { requestID: 0,
      responseTo: 0,
      opCode: 2004,
      flags: 0,
      collection: 'admin.$cmd',
      numberToSkip: 0,
      numberToReturn: -1,
      query: { ismaster: 1 } }
  },
  
  // reply to above
  {
    buffer : new Buffer([
      0x53, 0, 0, 0,
      0x9c, 0xaf, 0, 0xf5,
      0, 0, 0, 0,
      0x01, 0, 0, 0,
      0x08, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0,
      0x01, 0, 0, 0,
      
      0x2f, 0x00, 0x00,
      0x00, 0x08, 0x69, 0x73, 0x6d, 0x61, 0x73, 0x74, 0x65, 0x72, 0x00, 0x01, 0x10, 0x6d, 0x61, 0x78, 0x42, 0x73, 0x6f, 0x6e, 0x4f, 0x62, 0x6a, 0x65, 0x63, 0x74, 0x53, 0x69, 0x7a, 0x65, 0x00, 0x00, 0x00, 0x00, 0x01, 0x10, 0x6f, 0x6b, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00
/*    
      original bson doc, length=0x57 (maybe this bson parser is different from mongod's)
      0x33, 0, 0, 0,
      0x08, 0x69, 0x73, 0x6d, 0x61, 0x73, 0x74, 0x65, 0x72, 0, 0x01, 0x10, 0x6d, 0x61, 0x78, 0x42, 0x73, 0x6f, 0x6e, 0x4f, 0x62, 0x6a, 0x65, 0x63, 0x74, 0x53, 0x69, 0x7a, 0x65, 0, 0, 0, 0, 0x01, 0x01, 0x6f, 0x6b, 0, 0, 0, 0, 0, 0, 0, 0xf0, 0x3f, 0
*/    ]),
    message : {
      requestID: -184504420,
      responseTo: 0,
      opCode: 1,
      flags: 8,
      cursorID: 0,
      startingFrom: 0,
      numberReturned: 1,
      documents: [ { ismaster: true, maxBsonObjectSize: 16777216, ok: 1 } ]
    }
  },
  
  {
    buffer : new Buffer([
      0x41, 0, 0, 0,
      0x01, 0, 0, 0,
      0, 0, 0, 0,
      0xd2, 0x07, 0, 0,
      0, 0, 0, 0,
      0x74, 0x65, 0x73, 0x74, 0x2e, 0x74, 0x65, 0x73, 0x74, 0,
      0x23, 0, 0, 0,
      0x07, 0x5f, 0x69, 0x64, 0, 0x4e, 0x11, 0xf6, 0xa8, 0xde, 0xa5, 0x25, 0x2c, 0x77, 0, 0, 0, 0x02, 0x66, 0x6f, 0x6f, 0, 0x04, 0, 0, 0, 0x62, 0x61, 0x72, 0, 0
    ]),
    message : {
      requestID: 1,
      responseTo: 0,
      opCode: 2002,
      flags: 0,
      collection: 'test.test',
      documents: [ { _id: new ObjectID('4e11f6a8dea5252c77000000'), foo: 'bar' } ]
    }
  }
  
].forEach(function (test) {
  
  exports['read single, op code ' + test.message.opCode] = function (assert) {
    var reader = new WireReader();
    reader.on('message', function (message, buffer) {
      assert.deepEqual(test.message, message);
      assert.equal(test.buffer.toString('binary'), buffer.toString('binary'));
      assert.done();
    });
    
    reader.write(test.buffer);
  };
  
  exports['read double, op code ' + test.message.opCode] = function (assert) {
    var reader = new WireReader();
    var count = 0;
    reader.on('message', function (message, buffer) {
      count++;
      assert.deepEqual(test.message, message);
      assert.equal(test.buffer.toString('binary'), buffer.toString('binary'));
    });
    
    var double_buffer = new Buffer(test.buffer.length * 2);
    test.buffer.copy(double_buffer);
    test.buffer.copy(double_buffer, test.buffer.length);
    reader.write(double_buffer);
    setTimeout(function () {
      assert.equal(2, count);
      assert.done();
    }, 10);
  };
  
  exports['read fragmented, op code ' + test.message.opCode] = function (assert) {
    var reader = new WireReader();
    reader.on('message', function (message, buffer) {
      assert.deepEqual(test.message, message);
      assert.equal(test.buffer.toString('binary'), buffer.toString('binary'));
      assert.done();
    });
    
    var one_byte = new Buffer(1);
    for (var i = 0; i < test.buffer.length; i++) {
      one_byte[0] = test.buffer[i];
      reader.write(one_byte);
    }
  };
  
  exports['write, op code ' + test.message.opCode] = function (assert) {
    var writer = new WireWriter();
    writer.on('data', function (buffer) {
      assert.equal(test.buffer.toString('binary'), buffer.toString('binary'));
      assert.done();
    });
    
    writer.write(test.message);
  };
  
});
