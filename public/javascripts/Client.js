"use strict";

function Client() {
    var sock;          // socket to server
    var game;

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
        sock = new SockJS('http://' + Config.SERVER_NAME + ':' + Config.PORT + '/space');
        game = Game();
    }

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
    }
}

var c = new Client();
c.run()
