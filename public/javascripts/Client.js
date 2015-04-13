
function Client() {
    var sock;           // socket to server
    var captains = {};  // Array of captains currently in game
    var hooks = [];     // Array of hooks
    var myCaptain;
    var myHook;
    var isMyHookThrown = false;
    var pillars = [];
    var cursors;
	var wKey;
	var sKey;
    var ready = false;
	var myTeamScore = 0;
	var opponentTeamScore = 0;
	var delay=0;
	var calculatedDelay = 0;
	var gameInfor = "";
    //var that = this;

    var game = new Phaser.Game(800, 608, Phaser.CANVAS, 'captain-hook', { preload: preload, create: create, update: update, render: render });

    function preload() {
        game.load.tilemap('battlefield', '../assets/map.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tiles', '../assets/225835_hyptosis_tile-art-batch-1.png');
        game.load.image('tailBit', '../assets/hookTail.png');
        game.load.spritesheet('captain1', '../assets/captain1SpriteSheet.png', 32, 32);
        game.load.spritesheet('captain2', '../assets/captain2SpriteSheet.png', 32, 32);
        game.load.image('star', '../assets/star.png');
        game.load.image('tailBit', '../assets/hookTail.png')
    }

    var map;
    var layer;
    var layer2;
    function create() {
        game.physics.startSystem(Phaser.Physics.ARCADE);

        game.stage.backgroundColor = '#313131';
        map = game.add.tilemap('battlefield');
        map.addTilesetImage('225835_hyptosis_tile-art-batch-1', 'tiles');

        //  Creates a layer from the World1 layer in the map data.
        //  A Layer is effectively like a Phaser.Sprite, so is added to the display list.
        layer = map.createLayer('background');
        layer2 = map.createLayer('trees');

        //  This resizes the game world to match the layer dimensions
        layer.resizeWorld();
        layer2.resizeWorld();

        cursors = game.input.keyboard.createCursorKeys();
		wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
		sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
		var style = { font: "20px Arial", fill: "#ff0044", align: "center" };
		gameInfo = game.add.text(230, 20, "", style);
		///*
		if((window.DeviceMotionEvent)||('listenForDeviceMovement' in window)){
			window.addEventListener("devicemotion", onDeviceMotion,false);
		}
		//*/
    }
	///*
	function onDeviceMotion (e){
		var x = e.accelerationIncludingGravity.x;
		var y = e.accelerationIncludingGravity.y;
		//var z = e.accelerationIncludingGravity.z;
		var max = Math.max(Math.abs(x),Math.abs(y));
        var isKeyDown = true;
        var isThrowHook = false;
        if (game.input.activePointer.isDown) {
            isThrowHook = true;
        }

        var cursorDirection = "";
		if(max==Math.abs(x)){
			if(x>0){
				cursorDirection = "left";
				myCaptain.sprite.animations.play('left');
			}
			else if(x<0){
				cursorDirection = "right";
				myCaptain.sprite.animations.play('right');
			}
			else {
				myCaptain.sprite.animations.stop();
				isKeyDown = false;
			}
		}
		else if(max==Math.abs(y)){
			if(y<0){
				cursorDirection = "up";
				myCaptain.sprite.animations.play('up');
			}
			else if(y>0){
				cursorDirection = "down";
				myCaptain.sprite.animations.play('down');
			}
			else {
				myCaptain.sprite.animations.stop();
				isKeyDown = false;
			}
		}
		
        if (isKeyDown || isThrowHook) {
            sendToServer({type:"playerAction",
                            id: myCaptain.playerID,
                            direction: cursorDirection,
                            isThrowHook: isThrowHook,
                            mouse_x: game.input.x,
                            mouse_y: game.input.y});
        } 
	}

    /*
     * private method: sendToServer(msg)
     *
     * The method takes in a JSON structure and send it
     * to the server, after converting the structure into
     * a string.
     */
    var sendToServer = function (msg) {
        //console.log("send-> " + JSON.stringify(msg));
		var date = new Date();
		var currentTime = date.getTime();
		msg["timestamp"] = currentTime;
        sock.send(JSON.stringify(msg));
    };

    /*
     * priviledge method: run()
     *
     * The method is called to initialize and run the client.
     * It connects to the server via SockJS (so, run
     * "node MMOServer.js" first) and set up various
     * callbacks.
     *
     */
    this.run = function() {
        console.log(location.host);
        sock = new SockJS('http://' + Config.SERVER_NAME + '/captain');

        var count= [];
        sock.onmessage = function(e) {
            var message = JSON.parse(e.data);
            //console.log('Client received : ' + e.data);
            switch (message.type) {
                case "joined":
                    // Server allows THIS player to join game
                    myId = message.id;
                    myStartPos_x = message.x;
                    myStartPos_y = message.y;
                    myCaptain = new Captain(game, myStartPos_x, myStartPos_y, myId, message.tid);
                    captains[myId] = myCaptain;
                    ready = true;
                    break;

                case "new":
                    // New player has join the game
                    playerId = message.id;
                    playerStartPos_x = message.x;
                    playerStartPos_y = message.y;
                    captains[playerId] = new Captain(game, playerStartPos_x, playerStartPos_y, playerId, message.tid);
                    break;
					
				case "message":
					alert(message.content);
					break;

                case "delete":
                    // A player has left the game
                    //console.log('Delete Disconnected Player : ' + message.id);
                    playerId = message.id;
                    captains[playerId].sprite.kill();
                    delete captains[playerId];
                    break;

                case "update":
                    //console.log('Update position for ' + message.id);
					var t = message.timestamp;
					if(captains[message.id] == undefined || t<captains[message.id].lastUpdate){
						break;
					}
                    playerId = message.id;
                    playerNewPos_x = message.x;
                    playerNewPos_y = message.y;
                    playerHp = message.hp;
                    hookNewPos_x = message.hx;
                    hookNewPos_y = message.hy;
					hookReturn = message.hookReturn;
					isShoot = message.isShoot;
					beingHooked = message.beingHooked;
					killHook = message.killHook;
					respawn = message.respawn;
					timestamp = message.timestamp;
					playerDelay = message.playerDelay;
                    var direction = checkDirection(captains[playerId].sprite.x, captains[playerId].sprite.y, playerNewPos_x, playerNewPos_y);
                    switch (direction) {
                        case "up" :
                            captains[playerId].sprite.animations.play('up');
                            break;
                        case "down" :
                            captains[playerId].sprite.animations.play('down');
                            break;
                        case "left" :
                            captains[playerId].sprite.animations.play('left');
                            break;
                        case "right" :
                            captains[playerId].sprite.animations.play('right');
                            break;
                        case "noChange" :
                            count[playerId]++;
                            //if (count[playerId] > 100) {
                                captains[playerId].sprite.animations.stop();
                                //count[playerId] = 0;
                            //}
                            break;
                    }
					//setTimeout(captains[playerId].update,calculatedDelay,playerNewPos_x, playerNewPos_y, playerHp, hookNewPos_x, hookNewPos_y,beingHooked,hookReturn,killHook,isShoot,respawn,timestamp,playerDelay);
					//setTimeout(function(){
					captains[playerId].update(playerNewPos_x, playerNewPos_y, playerHp, hookNewPos_x, hookNewPos_y,beingHooked,hookReturn,killHook,isShoot,respawn,timestamp,playerDelay);
					//},calculatedDelay);
					

                    if(myCaptain.playerID==message.id){
						myTeamScore = message.playerTeamScore;
						opponentTeamScore = message.opponentTeamScore;
					}
                    break;

                default:
                    //console.log("error: undefined command " + message.type);
            }
        };

        sock.onclose = function() {
            // Connection to server has closed.  Delete everything.
            //console.log('Clear All Player');
            //clearAllPlayers();
        };

        sock.onopen = function() {
            // When connection to server is open, ask to join.
            sendToServer({type:"join_room", room: "game"});
        }
    };

    function updateMyActionsToServer() {
        var isKeyDown = true;
        var isThrowHook = false;
        if (game.input.activePointer.isDown) {
            isThrowHook = true;
        }

        var cursorDirection = "";
        if (cursors.left.isDown) {
            cursorDirection = "left";
            myCaptain.sprite.animations.play('left');
        } else if (cursors.right.isDown) {
            cursorDirection = "right";
            myCaptain.sprite.animations.play('right');
        } else if (cursors.up.isDown) {
            cursorDirection = "up";
            myCaptain.sprite.animations.play('up');
        } else if (cursors.down.isDown) {
            cursorDirection = "down";
            myCaptain.sprite.animations.play('down');
        } else {
            myCaptain.sprite.animations.stop();
            isKeyDown = false;
        } 
		
        if (isKeyDown || isThrowHook) {
			var states = {
				type:"playerAction",
				id: myCaptain.playerID,
				direction: cursorDirection,
				isThrowHook: isThrowHook,
				mouse_x: game.input.x,
				mouse_y: game.input.y
			};
            setTimeout(sendToServer,delay,states);
        }    
		
		if (wKey.isDown){
			delay += 20;
			sendToServer({type:"delay", delay:delay});
		} else if (sKey.isDown) {
			if (delay >= 20) {
				delay -= 20;
				// Send event to server
				sendToServer({type:"delay", delay:delay});
			}
		}
    }

     
    /*
     * Main (Phaser) game loop
     */
    function update() {
        if (!ready) 
            return;

        updateMyActionsToServer();

    }

    function render(pointer) {
        if (!ready) return;
		var myTeam = "";
		if(myCaptain.teamID==1){
			myTeam = "blue";
		}
		else{
			myTeam = "red";
		}
		gameInfo.setText(" player ID: "+myCaptain.playerID+" team Color: "+myTeam+" HP: "+myCaptain.hp+"\n"+" my team score: "+ myTeamScore+"\n"+" opponent team score: "+opponentTeamScore+"\n"+" delay: "+delay+"\n"+"updating delay: "+calculatedDelay+" ms");
		//game.debug.text(" player ID: "+myCaptain.playerID+" team Color: "+myTeam+" HP: "+myCaptain.hp,232,32);
		//game.debug.text(" my team score: "+ myTeamScore,302,54);
		//game.debug.text(" opponent team score: "+opponentTeamScore,302,76);
        //game.debug.text(" x:" + myCaptain.sprite.body.x + "   y:" + myCaptain.sprite.body.y + " player ID:" + myCaptain.playerID + " total other players:" + captains.length+ " HP:" + myCaptain.hp+" team ID: "+myCaptain.teamID, 32, 32);
		//game.debug.text(" isShoot: "+ myCaptain.isShooting + " killHook: " + myCaptain.killHook + " hookReturn: "+myCaptain.hookReturn + " beingHooked: "+myCaptain.beingHooked + " respawn: "+myCaptain.respawn,32,54);
		//game.debug.text("last time update for my character: "+myCaptain.lastUpdate+ " delay: "+delay+" ms",32,150);
        //game.debug.spriteInfo(sprite, 32, 450);
    }

    function checkDirection(prev_x, prev_y, new_x, new_y) {
        if ((new_x - prev_x) > 0) {
            return "right";
        } else if ((new_x - prev_x) < 0) {
            return "left";
        } else if ((new_y - prev_y) > 0) {
            return "down";
        } else if ((new_y - prev_y) < 0) {
            return "up";
        } else {
            return "noChange";
        }
    }
}

var client = new Client();
client.run();
