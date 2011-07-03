var WireReader = require('../lib/mongodb/WireReader');
var WireWriter = require('../lib/mongodb/WireWriter');

var tests = [

  {
    buffer : new Buffer([
      57, 0, 0, 0,
       1, 0, 0, 0,
       0, 0, 0, 0,
      0xd4, 0x07, 0, 0,
      0x10, 0, 0, 0,
      0x74, 0x65, 0x73, 0x74, 0x2e, 0x24, 0x63, 0x6d, 0x64, 0,
      0, 0, 0, 0,
      0xff, 0xff, 0xff, 0xff,
      0x13, 0, 0, 0,
      0x10, 0x69, 0x73, 0x6d, 0x61, 0x73, 0x74, 0x65, 0x72, 0, 0x01, 0, 0, 0, 0
    ]),
    message : {
      messageLength: 57,
      requestID: 1,
      responseTo: 0,
      opCode: 2004,
      flags: 16,
      collection: 'test.$cmd',
      numberToSkip: 0,
      numberToReturn: -1,
      query: {
        ismaster: 1
      }
    }
  },
  
  {
    buffer : new Buffer([
      0x36, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0,
      1, 0, 0, 0,
      0x12, 0, 0, 0,
      2, 0x66, 0x6f, 0x6f, 0, 4, 0, 0, 0, 0x62, 0x61, 0x72, 0, 0
    ]),
    message : {
      messageLength: 54,
      requestID: 0,
      responseTo: 0,
      opCode: 1,
      flags: 0,
      cursorID: 0,
      startingFrom: 0,
      numberReturned: 1,
      documents: { foo: 'bar' }
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
