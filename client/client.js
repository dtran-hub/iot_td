/*** client.js ***/
const io = require("socket.io-client");
const socket = io("http://localhost:3000");
// For Namespace User
const userSocket = io("http://localhost:3000/users");
const crypto = require("crypto");
const cryptoCipherKey = crypto.createCipher('aes-128-cbc', 'mypassword');
const cryptoDecipherKey = crypto.createDecipher('aes-128-cbc', 'mypassword');

var nickname = null;
var tempArr = [];

console.log("Connecting to the server...");

socket.on("connect", () => {
    nickname = process.argv[2];
    let plainPwd = process.argv[3];

    console.log("[INFO]: Welcome %s", nickname);

    socket.emit("join", {
        "sender": nickname,
        "password": plainPwd,
        "action": "join"
    });
});

socket.on("disconnect", (reason) => {
    console.log("[INFO]: Server disconnected, reason: %s", reason);
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

socket.on("broadcast", (data) => {
    console.log("%s", data.msg);
});

// Receive private message on 12/06/2021
socket.on("private message", (data) => {
    console.log("%s send you private message: %s", data.sender, data.msg);
});

socket.on("private message with crypto", (data) => {
    var msg = cryptoDecipherKey.update(data.msg, 'hex', 'utf8');
    msg += cryptoDecipherKey.final('utf8');
    console.log("%s send you private message with crypto: %s", data.sender, msg);
});

/*** client.js ***/
const readline = require('readline');
const {
    Console
} = require("console");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on("line", (input) => {
    if (true === input.startsWith("b;")) {
        var str = input.slice(2);
        socket.emit("broadcast", {
            "sender": nickname,
            "action": "broadcast",
            "msg": str
        });

        var x = input.split(';');
        console.log("b; " + x[1]);
    } else if ("ls;" === input) {
        socket.emit("list", {
            "sender": nickname,
            "action": "list"
        });
    } else if ("q;" === input) {
        socket.emit("quit", {
            "sender": nickname,
            "action": "quit"
        });
    }
    /* Block for process for new requirements from Professor */
    // Event send private message
    else if (true === input.startsWith("s;")) {
        tempArr = input.split(';');
        socket.emit("private message", {
            "sender": nickname,
            "receiver": tempArr[1],
            "msg": tempArr[2],
            "action": "send"
        });
    } else if ("tr;" === input) {
        socket.emit("trace");
    } else if (true === input.startsWith("jg;")) {
        tempArr = input.split(';');
        userSocket.emit("join room", {
            "sender": nickname,
            "group": tempArr[1],
            "action": "join_group"
        });
    } else if (true === input.startsWith("bg;")) {
        tempArr = input.split(';');
        userSocket.emit("broadcast room", {
            "sender": nickname,
            "group": tempArr[1],
            "msg": tempArr[2],
            "action": "broadcast_group"
        });
    } else if (true === input.startsWith("mbr;")) {
        tempArr = input.split(';');
        userSocket.emit("list members in room", {
            "sender": nickname,
            "group": tempArr[1],
            "action": "list_members_group"
        });
    } else if (true === input.startsWith("ch;")) {
        tempArr = input.split(';');
        userSocket.emit("chat in room", {
            "sender": nickname,
            "group": tempArr[1],
            "receiver": tempArr[2],
            "msg": tempArr[3],
            "action": "chat_group"
        });
    } else if (true === input.startsWith("msg;")) {
        tempArr = input.split(';');
        userSocket.emit("list messages in room", {
            "sender": nickname,
            "group": tempArr[1],
            "action": "list_messages_group"
        });
    } else if (true === input.startsWith("grp;")) {
        tempArr = input.split(';');
        userSocket.emit("list room", {
            "sender": nickname,
            "action": "list_groups"
        });
    } else if (true === input.startsWith("lg;")) {
        tempArr = input.split(';');
        userSocket.emit("leave room", {
            "sender": nickname,
            "group": tempArr[1],
            "action": "leave_group"
        });
    } else if (true === input.startsWith("msgs;")) {
        tempArr = input.split(';');
        userSocket.emit("list messages in room with sql lite", {
            "sender": nickname,
            "group": tempArr[1],
            "action": "list_messages_group_sqlite"
        });
    } else if (true === input.startsWith("umsgs;")) {
        userSocket.emit("list messages of a user in room with sql lite", {
            "sender": nickname,
            "action": "list_messages_user_sqlite"
        });
    } else if (true === input.startsWith("cryptmsg;")) {
        tempArr = input.split(';');
        var msg = cryptoCipherKey.update(tempArr[2], 'utf8', 'hex');
        msg += cryptoCipherKey.final('hex');
        socket.emit("private message with crypto", {
            "sender": nickname,
            "receiver": tempArr[1],
            "msg": msg,
            "action": "send_crypto"
        });
    }

});

/* Block to process user namespace for new requirements from Professor */
userSocket.on("success", (data) => {
    console.log(data);
});

userSocket.on("error", (data) => {
    console.log(data);
});

userSocket.on("broadcast room from server", (data) => {
    console.log(`Broadcast from ${data.group}: ${data.msg}`);
});

userSocket.on("list members in room from server", (data) => {
    var room = data[0].room;

    console.log(`Members (${data.length}) from ${room}`);
    console.log(data);
});

userSocket.on("chat messages in room from server", (data) => {
    var room = data.group;

    console.log(`Messages from ${data.sender} of ${room}`);
    console.log(data);
});

userSocket.on("list messages in room from server", (data) => {
    var room = data[0].room;

    console.log(`History of messages (${data.length}) from ${room}`);
    console.log(data);
});

userSocket.on("list groups from server", (data) => {
    console.log("List groups from server:")
    console.log(data);
});

userSocket.on("leave group from server", (data) => {
    console.log("Leave group from server:")
    console.log(data);
});

userSocket.on("list messages in room from server with sql lite", (data) => {
    console.log(`History of messages of room from sqlite`);
    console.log(data);
});

userSocket.on("list messages of a user in room from server with sql lite", (data) => {
    console.log(`History of messages of a user in room from sqlite`);
    console.log(data);
});