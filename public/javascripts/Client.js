
function Client() {
    var sock;           // socket to server
    var captains = [];  // Array of captains currently in game
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
    //var that = this;

    var game = new Phaser.Game(800, 608, Phaser.CANVAS, 'captain-hook', { preload: preload, create: create, update: update, render: render });

    function preload() {
        game.load.spritesheet('dude', '../assets/dude.png', 32, 48);
        game.load.image('star', '../assets/star.png');
        game.load.image('ground', '../assets/platform_vertical.png');
        game.load.tilemap('battlefield', '../assets/map.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tiles', '../assets/225835_hyptosis_tile-art-batch-1.png');
    }

    var map;
    var layer;
    var layer2;
    function create() {
        game.physics.startSystem(Phaser.Physics.ARCADE);

        // platforms = game.add.group();
        // platforms.enableBody = true;

        // ledge1 = platforms.create(270, 000, 'ground');
        // ledge1.scale.setTo(0.5, 1.5);
        // ledge1.body.immovable = true;

        // ledge2 = platforms.create(520, 000, 'ground');
        // ledge2.scale.setTo(0.5, 1.5);
        // ledge2.body.immovable = true;

        // pillar1 = platforms.create(650, 100, 'ground');
        // pillar1.scale.setTo(0.5, 0.04);
        // pillar1.body.immovable = true;

        // pillar2 = platforms.create(650, 500, 'ground');
        // pillar2.scale.setTo(0.5, 0.04);
        // pillar2.body.immovable = true;

        // pillar3 = platforms.create(150, 100, 'ground');
        // pillar3.scale.setTo(0.5, 0.04);
        // pillar3.body.immovable = true;

        // pillar4 = platforms.create(150, 500, 'ground');
        // pillar4.scale.setTo(0.5, 0.04);
        // pillar4.body.immovable = true;

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

        //server do this, client just nid update positions.
        // pillars[0] = pillar1;
        // pillars[1] = pillar2;
        // pillars[2] = pillar3;
        // pillars[3] = pillar4;
    }



    /*
     * private method: sendToServer(msg)
     *
     * The method takes in a JSON structure and send it
     * to the server, after converting the structure into
     * a string.
     */
    var sendToServer = function (msg) {
        console.log("send-> " + JSON.stringify(msg));
		var date = new Date();
		var currentTime = date.getTime();
		msg["timestamp"] = currentTime;
        sock.send(JSON.stringify(msg));
    }

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
        sock = new SockJS('http://' + Config.SERVER_NAME + ':' + Config.PORT + '/captain');

        sock.onmessage = function(e) {
            var message = JSON.parse(e.data);
            console.log('Client received : ' + e.data);
            switch (message.type) {
                case "joined":
                    // Server allows THIS player to join game
                    myId = message.id;
                    myStartPos_x = message.x;
                    myStartPos_y = message.y;
                    myCaptain = new Captain(game, myStartPos_x, myStartPos_y, myId);   
                    captains[myId] = myCaptain;
                    ready = true;
                    break;

                case "new":
                    // New player has join the game
                    playerId = message.id;
                    playerStartPos_x = message.x;
                    playerStartPos_y = message.y;
                    captains[playerId] = new Captain(game, playerStartPos_x, playerStartPos_y, playerId);
                    break;

                case "delete":
                    // A player has left the game
                    console.log('Delete Disconnected Player : ' + message.id);
                    playerId = message.id;
                    captains[playerId].sprite.kill();
                    delete captains[playerId];
                    break;

                case "update":
                    console.log('Update position for ' + message.id);
					var t = message.timestamp;
					if(t<captains[message.id].lastUpdate){
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
                    captains[playerId].update(playerNewPos_x, playerNewPos_y, playerHp, hookNewPos_x, hookNewPos_y,beingHooked,hookReturn,killHook,isShoot,respawn,timestamp);
					if(myCaptain.playerID==message.id){
						myTeamScore = message.playerTeamScore;
						opponentTeamScore = message.opponentTeamScore;
					}
                    break;

                default:
                    console.log("error: undefined command " + message.type);
            }
        };

        sock.onclose = function() {
            // Connection to server has closed.  Delete everything.
            console.log('Clear All Player');
            //clearAllPlayers();
        };

        sock.onopen = function() {
            // When connection to server is open, ask to join.
            sendToServer({type:"join"});
        }
    };

    /*
     * 
     */
    function updateMyActionsToServer() {
        var isKeyDown = true;
        var isThrowHook = false;
        if (game.input.activePointer.isDown) {
            isThrowHook = true;
        }

        var cursorDirection = "";
        if (cursors.left.isDown) {
            cursorDirection = "left";
        } else if (cursors.right.isDown) {
            cursorDirection = "right";    
        } else if (cursors.up.isDown) {
            cursorDirection = "up";
        } else if (cursors.down.isDown) {
            cursorDirection = "down";
        } else {
            isKeyDown = false;
        } 
		
        if (isKeyDown || isThrowHook) {
            sendToServer({type:"playerAction",
                            id: myCaptain.playerID,
                            direction: cursorDirection,
                            isThrowHook: isThrowHook,
                            mouse_x: game.input.x,
                            mouse_y: game.input.y});
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

    /*
     *
     */
    function render(pointer) {
        if (!ready) return;
		game.debug.text(" player ID: "+myCaptain.playerID+" team ID: "+myCaptain.teamID+" HP: "+myCaptain.hp,32,32);
		game.debug.text(" my team score: "+ myTeamScore+" opponent team score: "+opponentTeamScore,32,54);
        //game.debug.text(" x:" + myCaptain.sprite.body.x + "   y:" + myCaptain.sprite.body.y + " player ID:" + myCaptain.playerID + " total other players:" + captains.length+ " HP:" + myCaptain.hp+" team ID: "+myCaptain.teamID, 32, 32);
		//game.debug.text(" isShoot: "+ myCaptain.isShooting + " killHook: " + myCaptain.killHook + " hookReturn: "+myCaptain.hookReturn + " beingHooked: "+myCaptain.beingHooked + " respawn: "+myCaptain.respawn,32,54);
		game.debug.text("last time update for my character: "+myCaptain.lastUpdate+ " delay: "+delay+" ms",32,76);
        //game.debug.spriteInfo(sprite, 32, 450);
    }
}

var client = new Client();
client.run();


