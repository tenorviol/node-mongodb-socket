var WireReader = require('../lib/mongodb/WireReader');

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
      fullCollectionName: 'test.$cmd',
      numberToSkip: 0,
      numberToReturn: -1,
      query: {
        ismaster: 1
      }
    }
  }

].forEach(function (test) {
  
  exports['single, op code ' + test.message.opCode] = function (assert) {
    var reader = new WireReader();
    reader.on('message', function (message, buffer) {
      assert.deepEqual(test.message, message);
      assert.equal(test.buffer.toString('binary'), buffer.toString('binary'));
      assert.done();
    });
    reader.write(test.buffer);
  };
  
  exports['double, op code ' + test.message.opCode] = function (assert) {
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
  
  exports['fragmented, op code ' + test.message.opCode] = function (assert) {
    // TODO
    assert.done();
  };
  
});
