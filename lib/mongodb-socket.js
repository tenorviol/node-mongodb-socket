var net = require('net');


exports.createServer = createServer;


function createServer(callback) {
  var server = net.createServer(function (socket) {
    socket.pipe(socket);
  });
  return server;
}
