'use strict';

var SERVERPATH = "./";
var GAMEPATH = "../public/javascripts/";

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
		//console.log(players.length);
		//for(var i=0;i<players.length;i++){
		var date = new Date();
		var currentTime = date.getTime();
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
			for(var j in players){
				var delay = players[j].getDelay();
				var pid = players[j].pid;
				console.log("player("+pid+")'s delay: "+delay);
				setTimeout(unicast(sockets[pid],states),delay);
			}
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
					case "delay" :
						players[conn.id].delay = message.delay;
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
