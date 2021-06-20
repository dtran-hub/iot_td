/*** server.js ***/
const port = 3000;
const io = require("socket.io")(port);
console.log("Server is listening on port: %d", port);

io.on("connect", (socket) => {
    console.log("A user connected");
    
    socket.on("disconnect", (reason) => {
        console.log("A client disconnected, reason: %s", reason);
        console.log("Number of clients: %d", io.of('/').server.engine.clientsCount);
    });
    socket.on("broadcast", (data) => {
        console.log("%s", data);
        socket.broadcast.emit("broadcast", data);
    });

    socket.on("join", (data) => {
        console.log("\nNickname: ", data.sender, ", ID: ", socket.id);
        console.log("Number of clients: %d", io.of('/').server.engine.clientsCount);
        socket.nickname = data.sender;
        socket.broadcast.emit("join", data);
    });
    
    socket.on("list", (data) => {
        var users = [];    
        for (const [key, value] of io.of("/").sockets) {
        users.push(value.nickname);}
        socket.emit("list", {"sender": data.sender, "action": "list", "users": users});
    });

    socket.on("quit", (data) => {
    console.log("\n%s", data);
    socket.broadcast.emit("quit", data);
    socket.disconnect(true);
    });
});

