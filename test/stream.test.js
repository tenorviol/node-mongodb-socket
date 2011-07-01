var MongoStream = require('../lib/mongodb/MongoStream');

var stream = new MongoStream();

stream.on('message', function(msg) {
  console.log(msg);
});

var buffer = new Buffer(['f','o','o','d','f','o','o','d','f','o','o','d','f','o','o','d','f','o','o','d'])
stream.write(buffer);
