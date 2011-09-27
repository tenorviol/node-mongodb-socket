var socket = require('../lib/mongodb/socket');
var mongodb = require('mongodb');

var server;
var port = 3000;

exports['test server'] = function (assert) {
  server = socket.createServer(function (message, res) {
    console.log(message);
    res.reply({
      documents: [ { ismaster: true, maxBsonObjectSize: 16777216, ok: 1 } ]
    });
  });
  server.listen(port, function() {
    var connection = new mongodb.Server('localhost', port, {});
    var client = new mongodb.Db('test', connection);
    client.open(function (err, db) {
      var collection = new mongodb.Collection(db, 'test');
      client.close();
      server.close();
      assert.done();
    });
  });
};
