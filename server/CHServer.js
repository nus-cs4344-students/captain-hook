'use strict';

var SERVERPATH = "./";
require(SERVERPATH + "Player.js");
require(SERVERPATH + "Config.js");
require(SERVERPATH + "Room.js");
var roomScript = require(SERVERPATH + 'RoomLogic.js');

function CHServer(sock) {

    // private Variables
    var nextPID = 0;  // PID to assign to next connected player
    var socket = sock;
    var sockets = {}; // Associative array for sockets, indexed via player ID
    var room_players = {}; // Associative array for room_players, indexed via socket ID

	// array for lobby room_players
	var roomList = [];
	var playerList = [];

	var team1Score = 0;
	var team0Score = 0;

    var gameLoop = function() {
		//update game states for each player
		var p1;
		var p2;
		//for(var i = 0;i<room_players.length;i++){
		for(var i in room_players){
			p1 = room_players[i];
			if(p1.isShoot){
				if(p1.hookPillar){
					p1.calculatePositionByPillar(p1.hx,p1.hy);
				}
				else{
					//for(var j=0;j<room_players.length;j++){
					for(var j in room_players){
						p2 = room_players[j];
						if(p1.pid!=p2.pid){
							//if(!p2.beingHooked){
								if(distanceBetweenTwoPoints(p1.hx,p1.hy,p2.x,p2.y)<10){
									if(p1.teamID!=p2.teamID){
										//console.log("player "+p1.pid+"(teamID:"+p1.teamID+") hooked player "+p2.pid+"(teamID:"+p2.teamID+")");
										p2.hp--;//a bit different from real pudge war, being hooked will take damage.
									}
									p1.hookReturn = true;
									p2.beingHooked = true;
									p2.calculatePositionByHook(p1.x,p1.y);
								}
							//}
						}
					}
					p1.calculateHookPosition();
				}
			}
		}

		//for(var i=0;i<room_players.length;i++){
		for(var i in room_players){
			p1 = room_players[i];
			//for(var j=0;j<room_players.length;j++){
			for(var j in room_players){
				p2 = room_players[j];
				if(distanceBetweenTwoPoints(p1.x,p1.y,p2.x,p2.y)<20){
					if(p1.teamID!=p2.teamID){
						p1.hp--;
					}
				}
			}
		}
		
		for(var i in room_players){
			p = room_players[i];
			if(p.isFallInRiver()){
				p.hp -= 0.2;
			}
		}
		
		//respawn if any player's hp reach 0
		for(var i in room_players){
			var p = room_players[i];
			p.respawn = false;
			if(p.hp<1){
				p.x = p.initialX;
				p.y = p.initialY;
				p.hp = 100;
				p.respawn = true;
				p.beingHooked = false;
				p.hookReturn = false;
				p.killHook = false;
				p.isShoot = false;
				p.hookPillar = false;
				if(p.teamID==0){
					team1Score++;
				}
				else{
					team0Score++;
				}
			}
		}
		//console.log(room_players.length);
		//for(var i=0;i<room_players.length;i++){
		var date = new Date();
		var currentTime = date.getTime();
		for(var i in room_players){
			//console.log("broadcasting");
			var p = room_players[i];
			var playerTeamScore;
			var opponentTeamScore;
			if(p.teamID==1){
				playerTeamScore=team1Score;
				opponentTeamScore = team0Score;
			}
			else{
				playerTeamScore=team0Score;
				opponentTeamScore = team1Score;
			}
			if(currentTime>p.lastUpdate){
					p.lastUpdate = currentTime;
			}
			var states = {
				type:"update", 
				id: p.pid,
				hp: p.hp,
				x: p.x,
				y: p.y,
				hx:p.hx,
				hy:p.hy,
				beingHooked: p.beingHooked,
				hookReturn: p.hookReturn,
				killHook: p.killHook,
				isShoot: p.isShoot,
				respawn:p.respawn,
				teamID: p.teamID,
				playerTeamScore:playerTeamScore,
				opponentTeamScore:opponentTeamScore,
				timestamp:currentTime
			};
			for(var j in room_players){
				var delay = room_players[j].getDelay();
				var pid = room_players[j].pid;
				//console.log("player("+pid+")'s delay: "+delay);
				setTimeout(unicast(sockets[pid],states),delay);
			}
		}
    };

    this.start = function() {
		// create default room
		var room = new Room('game', 10);
		roomList.push(room);

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

            // When the client closes the connection to the
            // tell other clients the client left
            conn.on('close', function () {
				if (lobby_player.inRoom) {
					delete room_players[conn.id];
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
                var message = JSON.parse(data);

                switch (message.type) {
                    // for chatting
                    case "chat":
                        console.log('Broadcast : ' + message.msg + ' for ' + lobby_player.name);
                        var json_msg = {
                            'type': 'incomming_msg',
                            'msg': message.msg,
                            'name': lobby_player.name
                        };
                        GlobalChat(json_msg, lobby_player);
                        break;

                    case "join_room":
                        var room_name = message.room;
                        console.log(lobby_player.name + " > SELECTED ROOM: " + room_name);
                        lobby_player.joinRoom(room_name, roomList);
                        newPlayerInRoom(conn, lobby_player);

                        var player = room_players[conn.id];
                        var pid = room_players[conn.id].pid;
                        // A client has requested to join.
                        // Initialize a ship at random position
                        unicast(conn, {
                            type:"joined",
                            id: pid,
                            x: player.x,
                            y: player.y,
							tid: player.teamID
                        });

                        // and tell everyone.
                        broadcastUnless({
                            type: "new",
                            id: pid,
                            x: player.x,
                            y: player.y,
							tid: player.teamID
                        }, pid);

                        // Tell this new guy who else is in the game.
                        for (var i in room_players) {
                            if (i != conn.id) {
                                if (room_players[i] !== undefined) {
                                    unicast(sockets[pid], {
                                        type:"new",
                                        id: room_players[i].pid,
                                        x: room_players[i].x,
                                        y: room_players[i].y,
										tid: room_players[i].teamID
                                    });
                                }
                            }
                        }
                        break;
                }

                var p = room_players[conn.id];
                if (p === undefined) {
                    // we received data from a connection with
                    // no corresponding player.  don't do anything.
                    console.log("player at " + conn.id + " is invalid.");
					return;
                }

				switch (message.type) {
					case "playerAction":
						room_players[conn.id].calculatePositionByDirection(message.direction);
						if((!room_players[conn.id].beingHooked)&&(message.isThrowHook)){
							room_players[conn.id].setHookTarget(message.mouse_x,message.mouse_y);
						}
						break;
					case "delay" :
						room_players[conn.id].delay = message.delay;
						break;
                    default:
                        console.log("Unhandled " + message.type);
                }
            });
        });

		setInterval(function(){
			var nameList = [];
			playerList.forEach(function(p){
				nameList.push(p.name);
			});
			BroadcastAllInLobby({
				type: 'update_player_list',
				list: nameList
			}, null)
		}, 10);

        // cal the game loop
        setInterval(function() {gameLoop();}, 1000/Config.FRAME_RATE);
    };

    /*
     * private method: newPlayer()
     *
     * Called when a new connection is detected.
     * Create and init the new player.
     */
    var newPlayerInRoom = function (conn, player) {
        // Create player object and insert into room_players with key = conn.id
		var team = roomList[0].playerCount%2;
		console.log('number '+ roomList[0].playerCount);
		if(team == 1){
			player.x = 100;
			player.y = 100;
			room_players[conn.id] = player;
		}
		else{
			player.x = 700;
			player.y = 100*(team+1);
			room_players[conn.id] = player;
		}

		room_players[conn.id].teamID = team;
        sockets[player.pid] = conn;
        console.log('New player ' + conn.id + ' added.\n');
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

	// Add trim feature
	String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
	String.prototype.ltrim=function(){return this.replace(/^\s+/,'');};
	String.prototype.rtrim=function(){return this.replace(/\s+$/,'');};
	String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/,'');};

	// Add startsWith and endsWidth function for strings
	String.prototype.startsWith = function(prefix) {
		return this.indexOf(prefix) === 0;
	};

	String.prototype.endsWith = function(suffix) {
		return this.match(suffix+"$") == suffix;
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

function distanceBetweenTwoPoints(x1,y1,x2,y2){
	var diffX = x1-x2;
	var diffY = y1-y2;
	
	var distance = Math.sqrt(diffX*diffX+diffY*diffY);
	return distance;
}


global.CHServer = CHServer;
