var net = require('net');
var WireReader = require('../lib/mongodb/WireReader');

var socket = net.createServer(function (socket) {
  var client_reader = new WireReader();
  client_reader.on('message', function (msg, buffer) {
    console.log('Client :');
    console.log(buffer);
    console.log(msg);
  });
  socket.pipe(client_reader);
  
  var mongod = net.createConnection(27017);
  var server_reader = new WireReader();
  server_reader.on('message', function (msg, buffer) {
    console.log('Server :');
    console.log(buffer);
    console.log(msg);
  });
  mongod.pipe(server_reader);
  
  socket.pipe(mongod);
  mongod.pipe(socket);
});

socket.listen(3000);
