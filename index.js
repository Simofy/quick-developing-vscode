const WebSocket = require("ws");
let a = new WebSocket.Server({
  port: 1415
});

a.addListener("error", e => console.log("ERROR", e));
console.log(WebSocket);
a.addListener("connection", ws => {
  ws.on("message", data => {
    const message = JSON.parse(data);
    if(message.type == "TERMINATE"){
       ws.send(message.data)
       a.close()
    }
    console.log(message);
  });
});

var http = require("http");

var server = http.createServer(function(req, res) {
  res.writeHead(200);
  res.end("Hi everybody!");
});
server.listen(1010);
