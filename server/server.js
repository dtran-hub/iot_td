/*** server.js ***/
const port = 3000;
const io = require("socket.io")(port);
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

console.log("Server is listening on port: %d", port);

var arrUser = [];
var arrUserRoom = [];
var arrUserChattingRoom = [];
var db = null;
var create_connection_sqlite = function () {
    db = new sqlite3.Database('./db/chat.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.log("Exception from SQlite database for creating connection:");
            return console.error(err.message);
        }

        console.log('Connected to the SQlite database.');
    });
};
var close_connection_sqlite = function () {
    db.close((err) => {
        if (err) {
            console.log("Exception from SQlite database for closing connection:");
            console.error(err.message);
        }

        console.log('Close the database connection.');
    });
};
var create_table_sqlite = function () {
    create_connection_sqlite();
    db.run('create table if not exists RoomMessage (Room text, Sender text, Receiver text, Message text)');
    db.run('create table if not exists Accounts (Username, Password)');
    close_connection_sqlite();
};
var insert_roommessage_sqlite = function (room, sender, receiver, msg) {
    let ret = 0;

    create_connection_sqlite();
    db.run(`INSERT INTO RoomMessage(Room, Sender, Receiver, Message) VALUES(?, ?, ?, ?)`, [room, sender, receiver, msg], function (err) {
        if (err) {
            console.log("Exception from SQlite database for inserting RoomMessage table:");
            return console.log(err.message);
        }
        // get the last insert id
        console.log(`A row has been inserted with rowid ${this.lastID}`);
        ret = this.lastID;
    });
    close_connection_sqlite();

    return ret;
};
var query_roommessage_sqlite = function (sql, params, subject, event, socket) {
    create_connection_sqlite();
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.log("Exception from SQlite database for querying RoomMessage table:");
            throw err;
        }
        rows.forEach((row) => {
            console.log(`Rows has been responded for querying RoomMessage table based on the query: ${sql}`);
            console.log(row);
        });

        console.log("%s has information:", subject);
        console.log(rows);

        socket.emit(event, rows);
    });
    close_connection_sqlite();
};
// function to log in
var hasAccess = (result, err) => {
    if (result) {
        // insert login code here
        console.log("Access Granted!");

        return true;
    } else {
        // insert access denied code here
        console.log("Access Denied!");
        console.log(err);

        return false;
    }
};
var bcryptCompareForJoining = (pwd, hash, data, socket) => {
    bcrypt.compare(pwd, hash, function (errBcrypt, result) {
        if (hasAccess(result, errBcrypt)) {
            console.log("\nNickname: ", data.sender, ", ID: ", socket.id);
            console.log("Number of clients: %d", io.of('/').server.engine.clientsCount);
            socket.nickname = data.sender;
            socket.broadcast.emit("join", data);
        }
    });
};


io.on("connect", (socket) => {
    console.log("A user connected");

    create_table_sqlite();

    socket.on("disconnect", (reason) => {
        console.log("A client disconnected, reason: %s", reason);
        console.log("Number of clients: %d", io.of('/').server.engine.clientsCount);
    });

    socket.on("broadcast", (data) => {
        console.log("%s", data);
        socket.broadcast.emit("broadcast", data);
    });

    socket.on("join", (data) => {
        let sql = "select Username, Password from Accounts where Username = ?";
        let username = data.sender;
        let pwd = data.password;
        var filterUserArr = arrUser.filter(user => user.name != username);
        arrUser = filterUserArr;
        arrUser.push({
            name: username,
            id: socket.id
        });

        create_connection_sqlite();
        db.all(sql, [username], (err, rows) => {
            if (err) {
                console.log("Exception from SQlite database for querying Accounts table:");
                throw err;
            }
            rows.forEach((row) => {
                console.log(`Rows has been responded for querying Accounts table based on the query: ${sql}`);
                console.log(row);
            });

            if (rows.length == 0) {
                bcrypt.hash(pwd, saltRounds, function (subErr, hash) {
                    if (subErr) {
                        console.log("Exception from Bcrypt:");

                        return console.log(subErr);
                    }

                    create_connection_sqlite();
                    db.run(`INSERT INTO Accounts(Username, Password) VALUES(?, ?)`, [username, hash], function (errDB) {
                        if (errDB) {
                            console.log("Exception from SQlite database for inserting Accounts table:");

                            return console.log(errDB.message);
                        }
                        // get the last insert id
                        console.log(`A row has been inserted with rowid ${this.lastID} in Accounts table`);

                        bcryptCompareForJoining(pwd, hash, data, socket);
                    });
                    close_connection_sqlite();
                });
            } else {
                bcryptCompareForJoining(pwd, rows[0].Password, data, socket);
            }
        });
        close_connection_sqlite();
    });

    socket.on("list", (data) => {
        var users = [];
        for (const [key, value] of io.of("/").sockets) {
            users.push(value.nickname);
        }
        socket.emit("list", {
            "sender": data.sender,
            "action": "list",
            "users": users
        });
    });

    socket.on("quit", (data) => {
        console.log("\n%s", data);
        socket.broadcast.emit("quit", data);
        socket.disconnect(true);
    });

    // Transmit private message from server on 12/06/2021
    socket.on("private message", (data) => {
        console.log("Private message: %s", data);

        var receiverObject = arrUser.filter(user => user.name == data.receiver)[0];
        socket.to(receiverObject.id).emit("private message", data);
    });

    // Listen to the 'trace' event emitted from the client on 12/06/2021
    socket.on("trare", () => {
        console.log("\n=============== Trace ===============");
        console.log(io.of("/"));
    });

    socket.on("private message with crypto", (data) => {
        console.log("private message with crypto: %s", data);
        var receiverObject = arrUser.filter(user => user.name == data.receiver)[0];
        socket.to(receiverObject.id).emit("private message with crypto", data);
    });
});

/* Namespace: process for User on 12/06/2021*/
const usersNsp = io.of("/users");
let registeredRooms = ["Room 1", "Room 2", "Room 3"];

usersNsp.on("connect", (socket) => {
    console.log("Server is listening on connected to users namespace");

    socket.on("join room", (data) => {
        console.log("Joining Room...: " + data.group);
        console.log("The user is: " + data.sender);
        console.log("Message received from join room: %s", data);

        if (registeredRooms.includes(data.group)) {
            if (!arrUserRoom.some((elem) => elem.room == data.group && elem.user == data.sender)) {
                console.log("arrUser: ");
                console.log(arrUser);

                arrUserRoom.push({
                    "room": data.group,
                    "user": data.sender,
                    "id": arrUser.filter(user => user.name == data.sender)[0].id
                });
                socket.join(data.group);

                console.log("The user %s has joined the room as %s successfully", data.sender, data.group);

                //Socket has joined the request room
                return socket.emit("success", `${data.sender} has joined ${data.group} successfully`);
            } else {
                console.log("The user %s has joined unsuccessfully due to the same room as %s", data.sender, data.group);

                //Socket has joined the request room
                return socket.emit("error", `${data.sender} has joined ${data.group} unsuccessfully due to same room`);
            }
        } else {
            //No room with the specified Name! (or it could be another reason).
            return socket.emit("error", `${data.sender} has joined ${data.group} failedly`);
        }
    });

    socket.on("broadcast room", (data) => {
        console.log("Message received from broadcast room: %s", data);

        socket.in(data.group).emit("broadcast room from server", data);
    });

    socket.on("list members in room", (data) => {
        console.log("Message received from list members in room: %s", data);
        console.log("All information for rooms:");
        console.log(arrUserRoom);

        var members = arrUserRoom.filter(room => room.room == data.group);

        console.log("%s has information:", members[0].room);
        console.log(members);

        socket.emit("list members in room from server", members);
    });

    socket.on("chat in room", (data) => {
        console.log("Message received from chat in room: %s", data);
        console.log("All information for rooms:");
        console.log(arrUserChattingRoom.length == 0 ? "Temporarily, no information" : arrUserChattingRoom);

        insert_roommessage_sqlite(data.group, data.sender, data.receiver, data.msg);
        arrUserChattingRoom.push({
            "room": data.group,
            "sender": data.sender,
            "receiver": data.receiver,
            "id_sender": arrUser.filter(user => user.name == data.sender)[0].id,
            "id_receiver": arrUser.filter(user => user.name == data.receiver)[0].id,
            "message": data.msg
        });

        var members = arrUserRoom.filter(room => room.room == data.group);
        var receiver = members.find(elem => elem.user == data.receiver);

        console.log("%s has information:", receiver.user);
        console.log(receiver);

        socket.in(data.group).to(receiver.id).emit("chat messages in room from server", data);
    });

    socket.on("list messages in room", (data) => {
        console.log("Message received from list messages in room: %s", data);
        console.log("All information for rooms:");
        console.log(arrUserRoom);
        console.log("All history messages for rooms:");
        console.log(arrUserChattingRoom);

        var histories = arrUserChattingRoom.filter(room => room.room == data.group);

        console.log("%s has information:", histories[0].room);
        console.log(histories);

        socket.emit("list messages in room from server", histories);
    });

    socket.on("list room", (data) => {
        console.log("Message received from list room: %s", data);
        console.log("All information for rooms:");
        console.log(registeredRooms);

        socket.emit("list groups from server", registeredRooms);
    });

    socket.on("leave room", (data) => {
        console.log("Message received from leave room: %s", data);

        arrUserRoom = arrUserRoom.filter(elem => (elem.room != data.group) && (elem.room == data.group && elem.user != data.sender));
        socket.leave(data.group);
        socket.to(data.group).emit("leave group from server", data);
    });

    socket.on("list messages in room with sql lite", (data) => {
        console.log("list messages in room with sql lite: %s", data);
        console.log("All information for rooms:");
        console.log(arrUserRoom);

        let params = [];
        let sql = "select Room, Sender, Receiver, Message from RoomMessage where Room = ?";
        params.push(data.group);
        query_roommessage_sqlite(sql, params, data.group, "list messages in room from server with sql lite", socket);
    });

    socket.on("list messages of a user in room with sql lite", (data) => {
        console.log("list messages of a user in room with sql lite: %s", data);
        console.log("All information for rooms:");
        console.log(arrUserRoom);

        let params = [];
        let sql = "select Room, Sender, Receiver, Message from RoomMessage where Sender = ?";
        params.push(data.sender);
        query_roommessage_sqlite(sql, params, data.sender, "list messages of a user in room from server with sql lite", socket);
    });

});