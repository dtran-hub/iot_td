const io = require("socket.io-client");
const socket = io("http://localhost:3000");
var nickname = null;
var s_pattern = /^s;([A-Z0-9]+);(.+)/i;

const usersSocket = io("http://localhost:3000/users");
const ordersSocket = io("http://localhost:3000/orders");

console.log("Connecting to the server...");

socket.on("connect", () => {
    nickname = process.argv[2];
    console.log("[INFO]: Welcome %s", nickname);
    socket.emit("join", {"sender": nickname, "action": "join"});
});

socket.on("disconnect", (reason) => {
    console.log("[INFO]: Server disconnected, reason: %s", reason);
});

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on("line", (input) => {
    if (true === input.startsWith("b;")) {
        var str = input.slice(2);
        socket.emit("broadcast", {"sender": nickname, "action": "broadcast", "msg": str});
    }
    else if ("ls;" === input) {
        socket.emit("list", {"sender": nickname, "action": "list"});
    }
    else if ("q;" === input) {
        socket.emit("quit", {"sender": nickname, "action": "quit"});
    }
    else if ("tr;" === input) { // Tracing : tr
        socket.emit("trace");
    }
    else if (true === s_pattern.test(input)) {
        var info = input.match(s_pattern);
        socket.emit("send", {"sender": nickname, "action": "send", "receiver": info[1], "msg": info[2]});
    }
    // join group function
    else if (true === input.startsWith("jg;")) {
        var str = input.slice(3);
        socket.emit("join_group", {"sender": nickname, "action": "join_group", "group": str});
    }
    // broadcast function
    else if (true === bg_pattern.test(input)) {
        var info = input.match(bg_pattern);
        socket.emit("broadcast_group", {"sender": nickname, "action": "broadcast_group", "group": info[1], "msg": info[2]});
    }
    // list member of a group
    else if (true === input.startsWith("mbr;")) {
        var str = input.slice(4);
        socket.emit("list_members_group", {"sender": nickname, "action": "list_members_group", "group": str});
    }
    // List message group
    else if (true === input.startsWith("msg;")) {
        var str = input.slice(4);
        socket.emit("list_messages_group", {"sender": nickname, "action": "list_messages_group", "group": str});
    }
    //list group function
    else if ("grp;" === input) {
        socket.emit("list_groups", {"sender": nickname, "action": "list_groups"});
    }
    // leave group function

    else if (true === input.startsWith("lg;")) {
        var str = input.slice(3);
        socket.emit("leave_group", {"sender": nickname, "action": "leave_group", "group": str});
    }
    // list message user (self implement)
    // else if (true === input.startsWith(";")) {
    //     var str = input.slice(4);
    //     socket.emit("list_messages_user", {"sender": nickname, "action": "list_messages_user", "user": str});
    // }
});

socket.on("broadcast", (data) => {
    console.log("%s", data.msg);
});

socket.on("join", (data) => {
    console.log("[INFO]: %s has joined the chat", data.sender);
});

socket.on("list", (data) => {
    console.log("[INFO]: List of nicknames:");
    for (var i = 0; i < data.users.length; i++) {
        console.log(data.users[i]);
    }
});

socket.on("quit", (data) => {
    console.log("[INFO]: %s quit the chat", data.sender);
});

// Display message showing a person joined group....

socket.on("join_group", (data) => {
    console.log("[INFO]: %s has joined the group", data.sender);
});

// display message on group
socket.on("broadcast_group", (data) => {
    console.log("%s", data.msg);
});
// list member in group
socket.on("list_members_group", (data) => {
    console.log("[INFO]: List of members:");
    for (var i = data.members.length - 1; i >= 0; i--) {
        console.log(data.members[i]);
    }
});
// List message group
socket.on("list_messages_group", (data) => {
    console.log("[INFO]: History of messages:");
    for (var i = data.msgs.length - 1; i >= 0; i--) {
        console.log(data.msgs[i]);
    }
});
// List group
socket.on("list_groups", (data) => {
    console.log("[INFO]: List of groups:");
    for (var i = data.groups.length - 1; i >= 0; i--) {
        console.log(data.groups[i]);
    }
});
// display a client left group
socket.on("leave_group", (data) => {
    console.log("[INFO]: %s left the group", data.sender);
});
// list message user
// socket.on("list_messages_user", (data) => {
//     console.log("[INFO]: History of user messages:");
//     for (var i = data.msgs.length - 1; i >= 0; i--) {
//         console.log(data.msgs[i]);
//     }
// });

