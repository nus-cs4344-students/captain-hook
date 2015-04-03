"use strict";

function Client() {
    var sock;          // socket to server

    var that = this;

    /*
     * priviledge method: updateLoop()
     *
     * Calculate the movement of every ship and rocket.
     * Remove out-of-bound rocket, then render the whole
     * battle field.
     *
     */
	 
    var updateLoop = function() {
        var player = getLocalPlayer();
		var hook = getLocalHook();
		if(player.isMoving || player.beingHooked){
			sendToServer({type:"update",
							id: player.playerID,
							x: player.sprite.x,
							y: player.sprite.y});
		}
		
        if (player.isShooting) {
            sendToServer({type:"hook",
                id: player.playerID,
                x: hook.x,
				y: hook.y});
        }

		if (player.hookedPlayer != -1) {
			console.log("hooked one player : " + player.hookedPlayer);
			sendToServer({type:"update-hooked-player",
							id: player.playerID,
							hid: player.hookedPlayer,
							x: player.hook.x,
							y: player.hook.y});
		}
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
        sock = new SockJS('http://' + Config.SERVER_NAME + ':' + Config.PORT + '/captain');

        sock.onmessage = function(e) {
            var message = JSON.parse(e.data);
            console.log('Client received : ' + e.data);
            switch (message.type) {
                case "joined":
                    // server agree to join
                    console.log('Player joined : ' + message.id);
                    agreeJoin(message.x, message.y, message.id);

                    // Start the game loop
                    setInterval(function() {updateLoop();}, 1000/Config.FRAME_RATE);
                    break;

                case "new":
                    console.log('Existing Player Creation : ' + message.id);
                    // Add a player to the battlefield.
                    addPlayer(message.x, message.y, message.id);
                    break;

                case "delete":
                    console.log('Delete Disconnected Player : ' + message.id);
                    removePlayer(message.id);
                    break;

                case "update":
                    console.log('Update position for ' + message.id);
                    updatePlayerPosition(message.x, message.y, message.id);
                    break;

                case "hook":
                    console.log('Player is shooting : ' + message.id);
                    updateHookPosition(message.x, message.y, message.id);
					break;
                default:
                    console.log("error: undefined command " + message.type);
            }
        };

        sock.onclose = function() {
            // Connection to server has closed.  Delete everything.
            console.log('Clear All Player');
            clearAllPlayers();
        };

        sock.onopen = function() {
            // When connection to server is open, ask to join.
            sendToServer({type:"join"});
        }
    };

    /*
     * private method: showMessage(location, msg)
     *
     * Display a text message on the web page.  The
     * parameter location indicates the class ID of
     * the HTML element, and msg indicates the message.
     *
     * The new message replaces any existing message
     * being shown.
     */
    var showMessage = function(location, msg) {
        document.getElementById(location).innerHTML = msg;
    };

    /*
     * private method: sendToServer(msg)
     *
     * The method takes in a JSON structure and send it
     * to the server, after converting the structure into
     * a string.
     */
    var sendToServer = function (msg) {
        console.log("send-> " + JSON.stringify(msg));
        sock.send(JSON.stringify(msg));
    }

}

var c = new Client();
c.run();
