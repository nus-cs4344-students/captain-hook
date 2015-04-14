
function Client() {
    var sock;           // socket to server
    var captains = {};  // Array of captains currently in game
    var myCaptain;
    var cursors;
	var wKey;
	var sKey;
    var ready = false;
	var myTeamScore = 0;
	var opponentTeamScore = 0;
	var delay=0;
	var calculatedDelay = 0;

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
		var style = { font: "15px Arial", fill: "#ff0044", align: "center" };
		gameInfo = game.add.text(230, 20, "", style);

		if((window.DeviceMotionEvent) || ('listenForDeviceMovement' in window)){
			window.addEventListener("devicemotion", onDeviceMotion,false);
		}
    }

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

            switch (message.type) {
                case "joined":
                    // Server allows THIS player to join game
                    myId = message.id;
                    myStartPos_x = message.x;
                    myStartPos_y = message.y;
                    myCaptain = new Captain(game, myStartPos_x, myStartPos_y, myId, message.tid, message.pname);
                    captains[myId] = myCaptain;
                    ready = true;
                    break;

                case "new":
                    // New player has join the game
                    playerId = message.id;
                    playerStartPos_x = message.x;
                    playerStartPos_y = message.y;
                    captains[playerId] = new Captain(game, playerStartPos_x, playerStartPos_y, playerId, message.tid, message.pname);
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
                            captains[playerId].sprite.animations.stop();
                            break;
                    }

					captains[playerId].update(playerNewPos_x, playerNewPos_y, playerHp, hookNewPos_x, hookNewPos_y,beingHooked,hookReturn,killHook,isShoot,respawn,timestamp,playerDelay);

                    if(myCaptain.playerID==message.id){
						myTeamScore = message.playerTeamScore;
						opponentTeamScore = message.opponentTeamScore;
					}
                    break;

                default:
                    console.log("error: undefined command " + message.type);
            }
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

        document.getElementById('color').textContent = myTeam;
        document.getElementById('hp').textContent = Math.round(myCaptain.hp) + '';
        document.getElementById('my').textContent = myTeamScore + '';
        document.getElementById('opponent').textContent = opponentTeamScore + '';
        document.getElementById('delay').textContent = delay+' ms';
        document.getElementById('update_delay').textContent = calculatedDelay+' ms';
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
