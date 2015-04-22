'use strict';

var SERVERPATH = "./";
require(SERVERPATH + "Player.js");
require(SERVERPATH + "Config.js");
require(SERVERPATH + "Room.js");

function CHServer(sock) {

    // private Variables
    var nextPID = 0;  // PID to assign to next connected player
    var socket = sock;
    var sockets = {}; // Associative array for sockets, indexed via player ID

	// array for lobby room_players
	var roomList = [];
	var playerList = [];

	// for room id
	var nextRID = 0;

    this.start = function() {
        // Connection established from a client socket
        socket.on("connection", function(conn) {
			// Create new player on connected
			nextPID++;
			var lobby_player = new Player(0, 0, nextPID, conn);
			lobby_player.name = "player-" + nextPID;
			// Add to PlayerList
			playerList.push(lobby_player);

			console.log("[!] " + lobby_player.name + " connected!");

			// and tell everyone.
			BroadcastAllInLobby({
				type: "new_lobby_player",
				name: lobby_player.name
			}, lobby_player);

			unicast(conn, {type: 'given_name', name: lobby_player.name});

            // When the client closes the connection to the
            // tell other clients the client left
            conn.on('close', function () {
				if (lobby_player.inRoom) {
					delete lobby_player.room.room_players[conn.id];
				}

                broadcastUnless({
                        type: "delete",
                        id: lobby_player.pid
                    },
                    lobby_player.pid);
				// for chat room

				lobby_player.leaveRoom(); // Leave all room before disconnected

				playerList.remove(lobby_player);

				console.log("[!] " + lobby_player.name + " disconnected!");

				// Tell everyone Player disconnected
                BroadcastAll({
                    type: 'player_disconnection',
                    name: lobby_player.name
                }, null);
				// Close connection
				conn.end();
            });

            // When the client send something to the server.
            conn.on('data', function (data) {
				var msgProcessed = false;
                var message = JSON.parse(data);
                switch (message.type) {
                    // for chatting
                    case "chat":
						msgProcessed = true;
                        console.log('Broadcast : ' + message.msg + ' for ' + lobby_player.name);
                        var json_msg = {
                            'type': 'incomming_msg',
                            'msg': message.msg,
                            'name': lobby_player.name
                        };
                        GlobalChat(json_msg, lobby_player);
                        break;

					case "create_room":
						msgProcessed = true;
						var room_name = 'room-' + nextRID;
						// create default room
						var room = new Room(room_name, 6, sockets);
						roomList.push(room);

						// simulate a game for this room
						// cal the game loop
						setInterval(function() {room.gameLoop();}, 1000/Config.FRAME_RATE);

						// send successful
						unicast(conn, {type:'created_room', room_id:room_name});

						nextRID++;
						break;

					case "leave_room":
						msgProcessed = true;
						console.log("[!] " + lobby_player.name + " leaved room : " + message.name);
						delete lobby_player.room.room_players[conn.id];

						broadcastUnless({
								type: "delete",
								id: lobby_player.pid
							},
							null);
						// for chat room

						lobby_player.leaveRoom(); // Leave all room before disconnected

						roomList = roomList.filter(function(r) {
							return r.playerCount != 0;
						});

						break;

                    case "join_room":
						msgProcessed = true;
                        var room_name = message.room;

						var room = undefined;
						roomList.forEach(function(r) {
							if (r.name == room_name) {
								room = r;
							}
						});

						// reject if room is full
						if (room.playerCount >= 6) {
							unicast(conn, {
								type:"reject",
								room:room_name
							});
							return;
						}

                        console.log(lobby_player.name + " > SELECTED ROOM: " + room_name);
                        lobby_player.joinRoom(room_name, roomList);
                        newPlayerInRoom(conn, lobby_player, room_name);

						console.log('> Room try to join ...' + room.name);
						if (room === undefined) {
							console.log('> Room not found ...')
						}

                        var player = room.room_players[conn.id];
                        var pid = room.room_players[conn.id].pid;
                        // A client has requested to join.
                        // Initialize a ship at random position
                        unicast(conn, {
                            type:"joined",
                            id: pid,
                            x: player.x,
                            y: player.y,
							tid: player.teamID,
							pname: player.name,
							rname: player.room.name
                        });

                        // and tell everyone.
                        broadcastUnless({
                            type: "new",
                            id: pid,
                            x: player.x,
                            y: player.y,
							tid: player.teamID,
							pname: player.name,
							rname: player.room.name
                        }, pid);

                        // Tell this new guy who else is in the game.
                        for (var i in room.room_players) {
                            if (i != conn.id) {
                                if (room.room_players[i] !== undefined) {
                                    unicast(sockets[pid], {
                                        type:"new",
                                        id: room.room_players[i].pid,
                                        x: room.room_players[i].x,
                                        y: room.room_players[i].y,
										tid: room.room_players[i].teamID,
										pname: room.room_players[i].name,
										rname: player.room.name
                                    });
                                }
                            }
                        }
                        break;
                }

				if (msgProcessed) {
					return;
				}

				var room = undefined;
				roomList.forEach(function(r) {
					if (r.name == message.room) {
						room = r;
					}
				});

				if (room == undefined) {
					return;
				}

				var p = room.room_players[conn.id];
				if (p == undefined) {
					return;
				}

				switch (message.type) {
					case "playerAction":
						room.room_players[conn.id].calculatePositionByDirection(message.direction);
						if((!room.room_players[conn.id].beingHooked)&&(message.isThrowHook)){
							room.room_players[conn.id].setHookTarget(message.mouse_x,message.mouse_y);
						}
						break;
					case "delay" :
						room.room_players[conn.id].delay = message.delay;
						break;
                    default:
                        console.log("Unhandled " + message.type);
                }
            });
        });

		// update rooms and players
		setInterval(function(){
			var nameList = [];
			playerList.forEach(function(p){
				nameList.push(p.name);
			});

			var roomNameList = [];
			roomList.forEach(function(r){
				if (r.playerCount != 0) {
					roomNameList.push(r.name);
				}
			});

			BroadcastAllInLobby({
				type: 'update_player_room_list',
				player_list: nameList,
				room_list: roomNameList,
				nextRoom: nextRID
			}, null)
		}, 10);

    };

    /*
     * private method: newPlayer()
     *
     * Called when a new connection is detected.
     * Create and init the new player.
     */
    var newPlayerInRoom = function (conn, player, room_name) {
		var team = 0;
		var room = undefined;
		console.log('Room size : ' + roomList.length);
		roomList.forEach(function(r) {
			if (r.name == room_name) {
				room = r;
				//team = r.playerCount%2;
				if (r.team1Count >= r.team0Count) {
					team = 0;
					r.team0Count++;
				} else {
					team = 1;
					r.team1Count++;
				}
			}
		});

		if (room == undefined) {
			console.log('> Room not created!')
		}

		if(team == 1){
			player.x = 100;
			player.y = 100*(Math.floor((Math.random()*5)+1));
			player.initialX = 100;
			player.initialY = 100*(Math.floor((Math.random()*5)+1));
			room.room_players[conn.id] = player;
		}
		else{
			player.x = 700;
			player.y = 100*(Math.floor((Math.random()*5)+1));
			player.initialX = 700;
			player.initialY = 100*(Math.floor((Math.random()*5)+1));
			room.room_players[conn.id] = player;
		}

		room.room_players[conn.id].teamID = team;
        sockets[player.pid] = conn;
        console.log('> New player ' + conn.id + ' added.\n');
    };

    /*
     * private method: broadcast(msg)
     *
     * broadcast takes in a JSON structure and send it to
     * all room_players.
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
     * all room_players, except player id
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
    };

	// Add remove function for arrays
	Array.prototype.remove = function(e) {
		for (var i = 0; i < this.length; i++) {
			if (e == this[i]) { return this.splice(i, 1); }
		}
	};

	// Add find by name function for arrays (to find player or room)
	Array.prototype.find = function(name) {
		for (var i = 0; i < this.length; i++) {
			if (name == this[i].name) { return this[i]; }
		}
	};

	// Global Broadcast Function
	function BroadcastAll(message, except)
	{
		playerList.forEach(function(p){
			if (p != except)
			{
				p.socket.write(JSON.stringify(message));
			}
		});
	}

	// Global Broadcast Function
	function BroadcastAllInLobby(message, except)
	{
		playerList.forEach(function(p){
			if (p != except && !p.inRoom)
			{
				p.socket.write(JSON.stringify(message));
			}
		});
	}

	function GlobalChat(message, except)
	{
		if (except.room == null) // Only room_players in Global lobby can send message
		{
			playerList.forEach(function(p){
				if (p != except && p.room == null) // Only room_players in Global lobby can receive the message
				{
					p.socket.write(JSON.stringify(message));
				}
			});
		}
	}

}

global.CHServer = CHServer;
