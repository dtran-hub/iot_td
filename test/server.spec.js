/* test/server.spec.js */
// Load the 'chai' module with the 'expect' style
const expect = require("chai").expect;
// Load the 'socket.io-client' module
const io = require("socket.io-client");
var num_tests = 1;
describe('----Testing server in the chat', function() {
    var socket_1, socket_2;
    var username_1 = "ted";
    var username_2 = "roni";
    var options = { "force new connection": true };
    beforeEach(function (done) { 
        // This would set a timeout of 3000ms only for this hook
        this.timeout(3000);
        console.log(">> Test #" + (num_tests++));
        socket_1 = io("http://localhost:3000", options);
        socket_2 = io("http://localhost:3000", options);
        socket_1.on("connect", function() {
          console.log("socket_1 connected");
          socket_1.emit("join", {"sender": username_1, "action": "join"});
        });
        socket_2.on("connect", function() {
        console.log("socket_2 connected");
        socket_2.emit("join", {"sender": username_2, "action": "join"});
        });
        setTimeout(done, 500); // Call done() function after 500ms
    });

  afterEach(function (done) {
    // This would set a timeout of 2000ms only for this hook
    this.timeout(2000);
    socket_1.on("disconnect", function() {
    console.log("socket_1 disconnected");
    });
    socket_2.on("disconnect", function() {
    console.log("socket_2 disconnected\n");
    });
    socket_1.disconnect();
    socket_2.disconnect();
    setTimeout(done, 500); // Call done() function after 500ms
  });

  it('Notify that a user joined the chat', function(done) {
    socket_1.emit("join", {"sender": username_1, "action": "join"});
    socket_2.on("join", function(data) {
      expect(data.sender).to.equal(username_1);
      done();
  });  
  it('Broadcast a message to others in the chat', function(done) {
    var msg_hello = "hello socket_2";
    socket_1.emit("broadcast", {"sender": username_1, "action": "broadcast", "msg": msg_hello});
    socket_2.on("broadcast", function(data) {
      expect(data.msg).to.equal(msg_hello);
      done();
  });
  //...
  });
  // End describe
  describe('----Testing server in a group', function() {
  beforeEach(function (done) {
  //...  
  });
  afterEach(function (done) {
  //...  
  });  
  it('Notify that a user joined a group', function(done) {
  //...
  });
  it('Broadcast a message to a group', function(done) {
  //...  
  });
  //...
});
