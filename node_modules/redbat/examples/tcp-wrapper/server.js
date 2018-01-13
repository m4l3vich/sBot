const Namespace = require("../../src").Namespace;
const net = require("net");

const namespace = new Namespace({}, {});

const streamIn = namespace.getInputStream();
const streamOut = namespace.getOutputStream();

const server = net.createServer(function(socket) {
  streamOut.pipe(socket);
  socket.pipe(streamIn);

  doSomething();
});

function doSomething() {
  namespace.once("ping", function() {
    console.log("Ponging into client");

    namespace.emit("pong");
  });
}

server.listen(8080, "127.0.0.1");
