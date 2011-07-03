var WireWriter = require('../lib/mongodb/WireWriter');

var writer = new WireWriter();
writer.on('data', function (data) {
  console.log(data);
});

writer.write({
  opCode : 1,
  documents : [
    { foo : 'bar' }
  ]
});
