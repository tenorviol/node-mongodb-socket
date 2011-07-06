var mongodb = require('mongodb');

var port = 3000;

var connection = new mongodb.Server('localhost', port, {});
var client = new mongodb.Db('test', connection);
client.open(function (err, db) {
  var collection = new mongodb.Collection(db, 'test');
  client.close();
});
