const Namespace = require("../../src").Namespace;
const net = require("net");

const namespace = new Namespace({}, {});

const streamIn = namespace.getInputStream();
const streamOut = namespace.getOutputStream();

const client = new net.Socket();

client.connect(8080, "127.0.0.1", function() {
  client.pipe(streamIn);
  streamOut.pipe(client);

  doSomething();
});

function doSomething() {
  console.log("Sending event 'ping'");

  namespace.on("pong", function() {
    console.log("Got event 'pong'");
  });

  namespace.emit("ping", "test");
}
