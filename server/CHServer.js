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
	var team1Score = 0;
	var team0Score = 0;

	/*
		scenario 1:
			player A has pressed an arrow key and A is not being hooked.
			1.server received movement packet from player A
			2.server call A.calculatePosition(key)
			3.since A.beingHooked is false, server update the current position of A.
			4.server go into gameloop()
			5.checking the interaction with other players
			6.broadcast current states of all players to all players
		scenario 2:
			player A has pressed an array key and A is being hooked.
			1.server received movement packet from player A
			2.server call A.calculatePosition(key)
			3.since A.beingHooked is true, server remains the XY coordinates of A.
			4.server go into gameloop()
			5.checking the interaction with other players
			6.broadcast current states of all players to all players
		scenario 3:
			player A has just clicked LMB,and A hasnt thrown out any hook and A is not being hooked.
			1.server received throwHook packet from player A
			2.server check whether player A is being hooked
			3.since A is not being hooked, server call setHookTarget(targetX,targetY)
				3.1. since player A has never thrown out a hook, then set target coordinate, nid to be used when render the hook position in gameloop(), nid to be reset when the hook return to player A.
				3.2. set isShoot to be true, to indicate player A is shooting
			4.server go into gameloop()
			5.checking the interaction with other players
				5.1. since player A is shooting, server checks the interaction of this hook with all the other players
				5.2. if there is a player B that it's XY coordinates is close to the XY coordinates of the hook belongs to player A, then result is player A hooked player B
					5.2.1. if player A and player B is not in same team, player B will start deducting HP
					5.2.2. set the hookReturn to be true for player A, which means the hook of player A is going to return to player A
					5.2.3. set player B is being hooked, from now onwards, player B is not able to neither move or throw hook
					5.2.4. bind player B movement to be same as player A hook position.
				5.3. if player A and player B is close, set player B is not being hooked, from now onwards, player B can move and throw hook.
				5.4. calculate new XY coordinates of hook of player A
		scenario 4:
			player A has just clicked LMB,and A hasnt thrown out and hook and A is being hooked.
			1.server received throwHook packet from player A
			2.server check whether player A is being hooked
			3.since A is being hooked, server ignore the throwHook packet
			4.server go into gameloop()
			5.checking the interaction with other players
				5.1. since player A is not shooting, just check the closeness of player A with other players
			6.broadcast current states of all players to all players
		scenario 5:
			player A has just clicked LMB,and A has thrown out a hook and A is not being hooked.
			1.server received throwHook packet from player A
			2.server check whether player A is being hooked
			3.since A is not being hooked, server call setHookTarget(targetX,targetY)
				3.1. since A is shooting, so ignore set the XY coordinates
			4.server go into gameloop()
			5.checking the interaction with other players
				SAME AS SCENARIO 3 STEP 5
			6.broadcast current states of all players to all players
		scenario 6:
			player A has just clicked LMB,and A has thrown out a hook and A is being hooked.
			SAME AS SCENARIO 5...
		hook scenario 1:
			hook of player A has just thrown, and it will not hook any other players (a miss throw)
			1. when the hook of player A has not set to return to player A, when the distance between XY coordinates of A and XY coordinates of the hook is large than 500 pixels, it is set to be return to player A.
		hook scenario 2:
			hook of player A has just thrown, and it will
			hook player B (a success throw)
			SAME AS SCENARIO 3 STEP5
	*/
    var gameLoop = function() {
		//update game states for each player
		var p1;
		var p2;
		//for(var i = 0;i<players.length;i++){
		for(var i in players){
			p1 = players[i];
			if(p1.isShoot){
				if(p1.hookPillar){
					p1.calculatePositionByPillar(p1.hx,p1.hy);
				}
				else{
					//for(var j=0;j<players.length;j++){
					for(var j in players){
						p2 = players[j];
						if(p1.pid!=p2.pid){
							if(distanceBetweenTwoPoints(p1.hx,p1.hy,p2.x,p2.y)<10){
								if(p1.teamID!=p2.temID){
									p2.hp--;//a bit different from real pudge war, being hooked will take damage.
								}
								p1.hookReturn = true;
								p2.beingHooked = true;
								p2.calculatePositionByHook(p1.x,p1.y);
							}
						}
					}
					p1.calculateHookPosition();
				}
			}
		}
		
		//for(var i=0;i<players.length;i++){
		for(var i in players){
			p1 = players[i];
			//for(var j=0;j<players.length;j++){
			for(var j in players){
				p2 = players[j];
				if(distanceBetweenTwoPoints(p1.x,p1.y,p2.x,p2.y)<20){
					if(p1.teamID!=p2.teamID){
						p1.hp--;
					}
				}
			}
		}
		
		//respawn if any player's hp reach 0
		for(var i in players){
			var p = players[i];
			p.respawn = false;
			if(p.hp<1){
				p.x = p.initialX;
				p.y = p.initialY;
				p.hp = 100;
				p.respawn = true;
				if(p.teamID==0){
					team1Score++;
				}
				else{
					team0Score++;
				}
			}
		}
		//console.log(players.length);
		//for(var i=0;i<players.length;i++){
		for(var i in players){
			//console.log("broadcasting");
			var p = players[i];
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
			broadcast({
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
				opponentTeamScore:opponentTeamScore
			})
		}
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
					case "playerAction":
						players[conn.id].calculatePositionByDirection(message.direction);
						if((!players[conn.id].beingHooked)&&(message.isThrowHook)){
							players[conn.id].setHookTarget(message.mouse_x,message.mouse_y);
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
		var team = nextPID%2;
		if(team ==1){
			players[conn.id] = new Player(100,100*nextPID,conn.id,conn);
		}
		else{
			players[conn.id] = new Player(700,100*(nextPID-1),conn.id,conn);
		}
        //players[conn.id] = new Player(100, 100, conn.id, conn);
        players[conn.id].pid = nextPID;
		players[conn.id].teamID = nextPID%2;
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

function distanceBetweenTwoPoints(x1,y1,x2,y2){
	var diffX = x1-x2;
	var diffY = y1-y2;
	
	var distance = Math.sqrt(diffX*diffX+diffY*diffY);
	return distance;
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
