var socket = require('../lib/mongodb-socket');
var mongodb = require('mongodb');

var server;
var port = 3000;

exports['startup server'] = function (assert) {
  server = socket.createServer();
  server.listen(port, function() {
    assert.done();
  });
};

exports['test server'] = function (assert) {
  var connection = new mongodb.Server('localhost', port, {});
  var client = new mongodb.Db('test', connection);
  client.open(function (err, db) {
    var collection = new mongodb.Collection(db, 'test');
    assert.done();
  });
  //
  //collection.insert({ foo : 'bar' }, function (err, result) {
  //  if (err) {
  //    console.log(err.stack);
  //    assert.fail();
  //  }
  //  assert.done();
  //});
};

exports['shutdown server'] = function (assert) {
  server.close();
  assert.done();
};
