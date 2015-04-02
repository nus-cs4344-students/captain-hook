'use strict';

var SERVERPATH = "./";
var GAMEPATH = "../public/javascripts/";
var roomScript = require(SERVERPATH + "RoomLogic.js");

var net = require('net');
require(SERVERPATH + "Player.js");
require(SERVERPATH + "Utilities.js");
require(SERVERPATH + "Config.js");

function CHServer(sock) {

    // private Variables
    var nextPID = 0;  // PID to assign to next connected player
    var socket = sock;
    var sockets = {}; // Associative array for sockets, indexed via player ID
    var players = {}; // Associative array for players, indexed via socket ID

    var gameLoop = function() {
    };

    this.start = function() {
        // Connection established from a client socket
        socket.on("connection", function(conn) {
            newPlayer(conn);

            // When the client closes the connection to the
            // tell other clients the client left
            conn.on('close', function () {
                var pid = players[conn.id].pid;
                delete players[conn.id];
                broadcastUnless({
                    type: "delete",
                    id: pid}, pid)
            });

            // When the client send something to the server.
            conn.on('data', function (data) {
                var message = JSON.parse(data);
                var p = players[conn.id];
                if (p === undefined) {
                    // we received data from a connection with
                    // no corresponding player.  don't do anything.
                    console.log("player at " + conn.id + " is invalid.");
                    return;
                }

                switch (message.type) {
                    case "join":
                        var player = players[conn.id];
                        var pid = players[conn.id].pid;
                        // A client has requested to join.
                        // Initialize a ship at random position
                        unicast(conn, {
                            type:"joined",
                            id: pid,
                            x: player.x,
                            y: player.y
                        });

                        // and tell everyone.
                        broadcastUnless({
                            type: "new",
                            id: pid,
                            x: player.x,
                            y: player.y
                            }, pid);

                        // Tell this new guy who else is in the game.
                        for (var i in players) {
                            if (i != conn.id) {
                                if (players[i] !== undefined) {
                                    unicast(sockets[pid], {
                                        type:"new",
                                        id: players[i].pid,
                                        x: players[i].x,
                                        y: players[i].y
                                        });
                                }
                            }
                        }
                        break;

                    case "hook":
                        // A player has asked to hook.  Create
                        // tell everyone (excluding the player)
                        var pid = players[conn.id].pid;
                        broadcastUnless({
                            type:"hook",
                            id: pid,
                            x: message.x,
                            y: message.y
                        }, pid);
                        break;

                    case "update":
                        var pid = message.id;
                        // and tell everyone.
                        for (var i in sockets) {
                            if (i != pid) {
                                if (sockets[i] !== undefined) {
                                    unicast(sockets[i], {
                                        type:"update",
                                        id: message.id,
                                        x: message.x,
                                        y: message.y
                                    });
                                }
                            }
                        }
                        break;
					
					case "update-hooked-player":
						var pid = message.id;
						var hid = message.hid;
						for (var i in sockets) {
                            if (i != pid) {
                                if (sockets[i] !== undefined) {
                                    unicast(sockets[i], {
                                        type:"update",
                                        id: hid,
                                        x: message.x,
                                        y: message.y
                                    });
                                }
                            }
                        }
						
						break;

                    default:
                        console.log("Unhandled " + message.type);
                }
            });
        });

        // cal the game loop
        setInterval(function() {gameLoop();}, 1000/Config.FRAME_RATE);
    };

    /*
     * private method: newPlayer()
     *
     * Called when a new connection is detected.
     * Create and init the new player.
     */
    var newPlayer = function (conn) {
        nextPID ++;
        // Create player object and insert into players with key = conn.id
        players[conn.id] = new Player(100, 100, conn.id, conn);
        players[conn.id].pid = nextPID;
        sockets[nextPID] = conn;
        console.log('New player ' + conn.id + ' added.\n');
    };

    /*
     * private method: broadcast(msg)
     *
     * broadcast takes in a JSON structure and send it to
     * all players.
     *
     * e.g., broadcast({type: "abc", x: 30});
     */
    var broadcast = function (msg) {
        var id;
        for (id in sockets) {
            sockets[id].write(JSON.stringify(msg));
        }
    };

    /*
     * private method: broadcastUnless(msg, id)
     *
     * broadcast takes in a JSON structure and send it to
     * all players, except player id
     *
     * e.g., broadcast({type: "abc", x: 30}, pid);
     */
    var broadcastUnless = function (msg, pid) {
        var id;
        for (id in sockets) {
            if (id != pid)
                sockets[id].write(JSON.stringify(msg));
        }
    };

    /*
     * private method: unicast(socket, msg)
     *
     * unicast takes in a socket and a JSON structure
     * and send the message through the given socket.
     *
     * e.g., unicast(socket, {type: "abc", x: 30});
     */
    var unicast = function (socket, msg) {
        socket.write(JSON.stringify(msg));
    }
}

global.CHServer = CHServer;

/**
 Script: Node.JS Game Server - Core Server
 Template Author: Huy Tran
 Description:
 This project aim to create an easy to use multiplayer game server, programmers only
 have to implement gameplay logic which will be run in each game room and don't have
 to care much about the core server.
 The Core Server is a room-based multiplayer system that enable players connect, chat
 in Global Lobby, join/create room, chat in rooms.
 Room Logic will be implemented in run() method of the file: room.js
 -------------------------------------------

 CORE SERVER MESSAGES:

 1) Player connected to server
 RECEIVE: 	[CONNECTED;<player-name>]		(Everyone except sender)

 2) Player disconnected from server
 RECEIVE:	[DISCONNECTED;<player-name>] 	(Everyone except sender)

 3) Player send a chat message in Global chat
 SEND: 		[CHAT;<message>]
 RECEIVE: 	[CHAT;<player-name>;<message>]	(Everyone in Global lobby)

 4) Player created a Room
 SEND:		[CREATEROOM;<room-name>;<max-players>]

 5) Player joined room
 SEND:		[JOINROOM;<room-name>]
 RECEIVE:	[JOINEDROOM;<room-name>]		(Sender)
 [JOINROOM;<player-name>]		(Players already in room)
 [NOROOM;<room-name>]			(Sender - when room not found)
 [ROOMFULL;<room-name>]			(Sender - when room is full)

 6) Player left room
 SEND:		[LEAVEROOM]
 RECEIVE:	[LEFTROOM;<player-name>]		(Players already in room)

 7) Player chat in a room
 SEND:		[CHATROOM;<message>]
 RECEIVE:	[CHATROOM;<player-name>;<message>] (Players already in room)

 8) Get available room list:
 SEND:		[GETROOMLIST]
 RECEIVE:	[ROOMLIST;<list-of-room-name>]	(Sender)

 9) Ready/Cancel in room:
 SEND:		[READY] / [CANCEL]
 RECEIVE:	[PLAYERREADY;<player-name>] / [PLAYERCANCEL;<player-name>] (Players already in room)
 */
/*
var roomList = [];
var playerList = [];

// Update room
setInterval(function(){
    roomList.forEach(function(r){
        if (r.IsFinished() || (!r.IsWaiting() && r.playerCount <= 0))
        {
            roomList.remove(r);
        }
        if (!r.IsFinished() && r.playerCount > 0)
        {
            // Switch from READY to PLAYING mode
            if (r.IsReady())
            {
                var isAllReady = true;
                r.players.forEach(function(p){
                    if (p.is_ready == false)
                    {
                        isAllReady = false;
                    }
                });
                if (isAllReady)
                {
                    r.Play();
                }
            }
            roomScript.update(r);
        }
    });
}, 10);
*/

// Main Server
/*
net.createServer(function(socket) {
    // Create new player on connected
    var player = new Player(0, 0, "player-" + playerList.length, socket);
    // Add to PlayerList
    playerList.push(player);

    console.log("[!] " + player.name + " connected!");

    // Tell everybody the newcomer
    BroadcastAll("[CONNECTED;" + player.name + "]", player);

    // Process received data
    var receivedData = "";
    socket.on('data', function(data) {
        receivedData = data + "";
        console.log("[i] Data received: " + player.name + " said: " + receivedData);

        // ==================SERVER PROCESSING============================
        // Implement chat in lobby feature
        if (receivedData.startsWith("[CHAT;"))
        {
            // Broadcast
            var chat = receivedData.substring(6, receivedData.length - 1);
            GlobalChat("[CHAT;" + player.name + ";" + chat + "]", player);
        }

        // Basic Room function: Get list, create, join, leave, chat in room
        if (receivedData.startsWith("[GETROOMLIST]"))
        {
            var list = "";
            // Get room list
            roomList.forEach(function(r){
                list += r.name;
            });
            socket.write("[ROOMLIST;" + list + "]");
        }
        if (receivedData.startsWith("[CREATEROOM;"))
        {
            var roomData = receivedData.substring(12, receivedData.length - 1); // RoomName;MaxPlayer
            var roomDataArr = roomData.split(';');
            if (roomDataArr.length >= 2)
            {
                var room = new Room(roomDataArr[0], parseInt(roomDataArr[1]));
                roomList.push(room);
                console.log("[+] Room " + room.name + " created by " + player.name);
                player.leaveRoom();
                player.joinRoom(room.name);
            }
        }
        if (receivedData.startsWith("[JOINROOM;"))
        {
            var roomName = receivedData.substring(10, receivedData.fulltrim().length - 1);
            console.log("> SELECTED ROOM: " + roomName);
            player.joinRoom(roomName);
        }
        if (receivedData.startsWith("[LEAVEROOM]"))
        {
            player.leaveRoom();
        }
        if (receivedData.startsWith("[CHATROOM;"))
        {
            // Broadcast
            var chat = receivedData.substring(10, receivedData.length - 1);
            player.room.broadCast("[CHATROOM;" + player.name + ";" + chat + "]", player);
        }
        if (receivedData.startsWith("[READY]"))
        {
            player.Ready();
        }
        if (receivedData.startsWith("[CANCEL]"))
        {
            player.Cancel();
        }
        // ===================== EACH ROOM ================================
        roomList.forEach(function(r){
            roomScript.run(r, player, receivedData);
        });
        // ================================================================

        receivedData = "";
    });

    // Handle player disconnect event
    socket.on('close', function(){
        player.leaveRoom(); // Leave all room before disconnected

        playerList.remove(player);

        console.log("[!] " + player.name + " disconnected!");

        // Tell everyone Player disconnected
        playerList.forEach(function(c){
            // Send disconnect notify - MSG: [DC;<player name>]
            c.socket.write("[DISCONNECTED;" + player.name + "]");
        });
        // Close connection
        socket.end();
    });

})
    .listen(serverPort);

console.log("Server is running at port " + serverPort);
*/
