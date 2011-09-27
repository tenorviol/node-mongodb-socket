
test: nodeunit

nodeunit:
	nodeunit test/protocol.test.js
	nodeunit test/socket.test.js
