/*** server.js ***/
const port = 3000;
const io = require("socket.io")(port);
console.log("Server is listening on port: %d", port);

io.on("connect", (socket) => {
    // Display a event when there's a user connected
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
    // Listen to the 'trace' event emitted from the client on 12/06/2021
    socket.on("trace", () => {
        console.log("\n=============== Trace ===============");
        console.log(io.of("/"));
    });
});
// using namespace

const usersNsp = io.of("/users");
// usersNsp.on("connect", (socket) => {

// using default namespace for sake of simplicity
io.of("/").on("connect", (socket) => {
    console.log("Listening users connected in namespace");
    socket.on("send", (data) => {
        console.log("\n%s", data);
        
        var socket_id = null;
        for (const [key, value] of io.of("/").sockets) {
            if (data.receiver.toLowerCase() === value.nickname) {
                socket_id = key;
            }
        }        if (socket_id !== null) {
            io.of("/").to(socket_id).emit("send", data);
        }
    });
    socket.on("join_group", (data) => {
        console.log("\n%s", data);
        socket.join(data.group);
        console.log("Group: ", data.group, ", Joined: ", data.sender);
        io.of("/").to(data.group).emit("join_group", data);
    });
    socket.on("broadcast_group", (data) => {
        console.log("\n%s", data);
        socket.to(data.group).emit("broadcast_group", data);
        if (undefined === io.of("/").room_messages) {
            io.of("/").room_messages = {};
        }        if (undefined === io.of("/").room_messages[data.group]) {
            io.of("/").room_messages[data.group] = [];
        }   io.of("/").room_messages[data.group].push(data.msg);
        db_save_message(data.group, data.sender, data.msg);
    });
    socket.on("list_members_group", (data) => {
        console.log("\n%s", data);        
        var socket_ids;
        var members = [];
        for (const [key, value] of io.of("/").adapter.rooms) {
            if (key === data.group) {
                socket_ids = value;
            }
        }        socket_ids.forEach((socket_id) => {
            const socket_in_room = io.of("/").sockets.get(socket_id);
            members.push(socket_in_room.nickname);
        });
        socket.emit("list_members_group", {"sender": data.sender, "action": "list_members_group", "group": data.group, "members": members});
    });
    // socket.on("list_messages_group", (data) => {
        // console.log("\n%s", data);        
        // var msgs = io.of("/").room_messages[data.group];
        // socket.emit("list_messages_group", {"sender": data.sender, "action": "list_messages_group", "group": data.group, "msgs": msgs});
    // List message group from DB
    socket.on("list_messages_group", () => {
        console.log("\n%s", data);        
        db.serialize(() => {
            db.all("SELECT msg FROM room_messages WHERE thegroup = ?", [data.group], (err, rows) => {
            var msgs = [];
    
            if (err) {
                throw err;
            }
                rows.forEach((row) => {
                console.log("Got a message from the database: " + row.msg);
                msgs.push(row.msg);
            });
        socket.emit("list_messages_group", {"sender": data.sender, "action": "list_messages_group", "group": data.group, "msgs": msgs});
        });
    }); 
    
    // to list group
    socket.on("list_groups", (data) => {
        console.log("\n%s", data);        var groups = [];        for (const [key, value] of io.of("/").adapter.rooms) {
            if (false === value.has(key)) {
                groups.push(key);
            }
        }
        socket.emit("list_groups", {"sender": data.sender, "action": "list_groups", "groups": groups});
    });
    // leave group function
    socket.on("leave_group", (data) => {
        console.log("\n%s", data);
        
        socket.leave(data.group);
        console.log("Group: ", data.group, ", Left: ", data.sender);
        io.of("/").to(data.group).emit("leave_group", data);
    });
    // list message users
    socket.on("list_messages_user", (data) => {
        console.log("\n%s", data);        
        var msgs = io.of("/").room_messages[data.user];
        socket.emit("list_messages_user", {"sender": data.sender, "action": "list_messages_users", "user": data.user, "msgs": msgs});
    });
});

const ordersNsp = io.of("/orders");
ordersNsp.on("connect", (socket) => {
    //...
});

function db_save_message(group, sender, msg) {
    db.serialize(() => {        
        db.run("CREATE TABLE IF NOT EXISTS room_messages(thegroup TEXT, sender TEXT, msg TEXT)", function(err) {
            if (err) {
                throw err;
            }
        });

        db.run("INSERT INTO room_messages(thegroup, sender, msg) VALUES(?,?,?)", [group, sender, msg], function(err) {
            if (err) {
                throw err;
            }
            console.log("Saved the message to the database, rowid: " + this.lastID);
        });
    });
}
