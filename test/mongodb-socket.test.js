var socket = require('../lib/mongodb-socket');
var net = require('net');

var server;
var port = 3000;

exports['startup server'] = function (assert) {
  server = socket.createServer();
  server.listen(port, function() {
    assert.done();
  });
};

exports['test server'] = function (assert) {
  var c = net.createConnection(port);
  c.setEncoding('utf8');
  c.on('connect', function () {
    
    var msg = 'Hi, how are you?!!!';
    c.write(msg, 'utf8');
    
    c.on('data', function (data) {
      assert.equal(msg, data);
      c.end();
    });
    
    c.on('end', function () {
      assert.done();
    });
  });
};

exports['shutdown server'] = function (assert) {
  server.close();
  assert.done();
};
