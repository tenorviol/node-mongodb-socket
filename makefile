
test: nodeunit

nodeunit:
	nodeunit test/reader.test.js
	nodeunit test/socket.test.js
