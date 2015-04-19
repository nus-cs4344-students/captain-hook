
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
    var roomJoined = undefined;

    var player_size = 0;
    var room_size = 0;
	
	var audio1= $("#actrl")[0];
	var audio2= $("#actrl2")[0];

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
		audio2.play();
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

    }

    function onDeviceMotion (e){
        var x = e.accelerationIncludingGravity.x;
        var y = e.accelerationIncludingGravity.y;
        //var z = e.accelerationIncludingGravity.z;
        var max = Math.max(Math.abs(x),Math.abs(y));
        var isKeyDown = true;
        var isThrowHook = false;
        if (game.input.activePointer.isDown) {
			audio1.play();
            isThrowHook = true;
        }

        var cursorDirection = "";
        if(max==Math.abs(x)){
            if(x>1){
                cursorDirection = "left";
                myCaptain.sprite.animations.play('left');
            }
            else if(x<0){
                if(Math.abs(x)>1) {
                    cursorDirection = "right";
                    myCaptain.sprite.animations.play('right');
                }
            }
            else {
                if(myCaptain.sprite!=undefined){
                    myCaptain.sprite.animations.stop();
                }
                isKeyDown = false;
            }
        }
        else if(max==Math.abs(y)){
            if(y<0){
                if(Math.abs(y)>1) {
                    cursorDirection = "up";
                    myCaptain.sprite.animations.play('up');
                }
            }
            else if(y>1){
                cursorDirection = "down";
                myCaptain.sprite.animations.play('down');
            }
            else {
                myCaptain.sprite.animations.stop();
                isKeyDown = false;
            }
        }
        
        if (isKeyDown || isThrowHook) {
            var states = {
                type:"playerAction",
                id: myCaptain.playerID,
                direction: cursorDirection,
                isThrowHook: isThrowHook,
                mouse_x: game.input.x,
                mouse_y: game.input.y,
                room: roomJoined
            };
            setTimeout(sendToServer,delay,states);

            // sendToServer({type:"playerAction",
            //                 id: myCaptain.playerID,
            //                 direction: cursorDirection,
            //                 isThrowHook: isThrowHook,
            //                 mouse_x: game.input.x,
            //                 mouse_y: game.input.y});
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
                /**
                 * For chat service
                 */
                case "new_lobby_player":
                    var text = message.name + ' joined!';

                    var item = document.createElement('div');
                    item.className = 'ui yellow message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.scrollTop = box.scrollHeight;

                    break;

                case 'given_name':
                    var text = 'Your name is ' + message.name;

                    var item = document.createElement('div');
                    item.className = 'ui pink message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.scrollTop = box.scrollHeight;

                    break;

                case 'player_disconnection':
                    var text = message.name + ' disconnected!';

                    var item = document.createElement('div');
                    item.className = 'ui red message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.scrollTop = box.scrollHeight;
                    break;

                case "incomming_msg":
                    var text = message.name + ' says > ' + message.msg;

                    var item = document.createElement('div');
                    item.setAttribute('align', 'left');
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.scrollTop = box.scrollHeight;
                    break;

                case "created_room":
                    sendJoinRoomMsg(message.room_id);
                    break;

                case "reject":
                    var text = message.room + ' has reached maximum players 6! Try another room.';

                    var item = document.createElement('div');
                    item.className = 'ui red message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.scrollTop = box.scrollHeight;

                    var section3 = document.getElementById('section3');
                    section3.style.visibility = 'hidden';
                    roomJoined = undefined;

                    break;

                case "update_player_room_list":
                    var players = message.player_list;
                    var ui = document.getElementById('player_list');

                    if (player_size != players.length) {
                        $(ui).empty();

                        players.forEach(function (p) {
                            var item = document.createElement('div');
                            item.className = 'item';
                            var image = document.createElement('img');
                            image.className = 'ui avatar image';
                            image.src = 'assets/daniel.jpg';

                            var header_div = document.createElement('div');
                            header_div.className = 'content';

                            var header = document.createElement('div');
                            header.className = 'header';
                            header.textContent = p;

                            header_div.appendChild(header);

                            item.appendChild(image);
                            ui.appendChild(item);
                            ui.appendChild(header_div);
                            console.log(p);
                        });
                        player_size = players.length;
                    }

                    var rooms = message.room_list;
                    var room_ui = document.getElementById('room_list');

                    if (room_size != rooms.length) {
                        $(room_ui).empty();

                        rooms.forEach(function (r) {
                            var item = document.createElement('div');
                            item.className = 'item';

                            var button = document.createElement('div');
                            button.className = "ui labeled icon blue button";
                            button.id = r;
                            button.setAttribute('onclick', 'client.joinRoom(this.id)');

                            var icon = document.createElement('i');
                            icon.className = 'game icon';

                            var detail = document.createElement('div');
                            detail.textContent = r;

                            button.appendChild(icon);
                            button.appendChild(detail);
                            item.appendChild(button);

                            var list = document.getElementById('room_list');
                            list.appendChild(item);

                        });
                        room_size = rooms.length;
                    }

                    break;

                /**
                 * For game
                 */
                case "joined":
                    // Server allows THIS player to join game
                    myId = message.id;
                    myStartPos_x = message.x;
                    myStartPos_y = message.y;
                    myCaptain = new Captain(game, myStartPos_x, myStartPos_y, myId, message.tid, message.pname, message.rname);
                    captains[myId] = myCaptain;
                    ready = true;
                    break;

                case "new":
                    // New player has join the game
                    playerId = message.id;
                    playerStartPos_x = message.x;
                    playerStartPos_y = message.y;
                    if (myCaptain.roomName == message.rname) {
                        captains[playerId] = new Captain(game, playerStartPos_x, playerStartPos_y, playerId, message.tid, message.pname);
                    } else {
                        return;
                    }
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

        /*
        sock.onopen = function() {
            // When connection to server is open, ask to join.
            sendToServer({type:"join_room", room: "game"});
        }
        */
    };

    function updateMyActionsToServer() {
        var isKeyDown = true;
        var isThrowHook = false;
        if (game.input.activePointer.isDown) {
			audio1.play();
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
                mouse_y: game.input.y,
                room: roomJoined
            };
            setTimeout(sendToServer,delay,states);
        }    
        
        if (wKey.isDown){
            delay += 20;
            sendToServer({type:"delay", delay:delay, room:roomJoined});
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

        if((window.DeviceMotionEvent) || ('listenForDeviceMovement' in window)){
            window.addEventListener("devicemotion", onDeviceMotion, false);
        }
		audio2.addEventListener('ended', function(){
			audio2.play();
		});

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

        document.getElementById('room').textContent = myCaptain.roomName;
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

    this.createNewRoom = function() {
        sendToServer({
            type: 'create_room'
        });
    };

    this.leaveRoom = function() {
        var section3 = document.getElementById('section3');
        section3.style.visibility = 'hidden';
        sendToServer({
            type: 'leave_room',
            name: roomJoined
        });
        roomJoined = undefined;
        // clear all characters
        console.log(captains.length);
        for (var id in captains) {
            captains[id].sprite.kill();
        }
        myCaptain.sprite.kill();
        // refresh room list, set to 0 to trigger refresh
        room_size = -1;
    };

    /**
     * For chat service
     */
    function sendJoinRoomMsg(room_id) {
        var section3 = document.getElementById('section3');
        section3.style.visibility = 'visible';
        roomJoined = room_id;
        sendToServer({
            type: 'join_room',
            room: room_id
        });
    }

    // from doc element
    this.joinRoom = function(room_id) {
        var section3 = document.getElementById('section3');
        section3.style.visibility = 'visible';
        roomJoined = room_id;
        sendToServer({
            type: 'join_room',
            room: room_id
        });
    };

    this.searchKeyPress = function(e)
    {
        // look for window.event in case event isn't passed in
        e = e || window.event;
        if (e.keyCode == 13)
        {
            document.getElementById('message_send').click();
        }
    };

    this.sendChatMessage = function() {
        var text = document.getElementById('message_input').value;
        sendToServer({
            type: 'chat',
            msg: text
        });

        var item = document.createElement('div');
        item.setAttribute('align', 'left');
        item.textContent = 'me > ' + text;

        var box = document.getElementById('chatarea');
        box.appendChild(item);
        box.scrollTop = box.scrollHeight;

        document.getElementById('message_input').value = '';
    };
}

var client = new Client();
client.run();
