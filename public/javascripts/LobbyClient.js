
function Client() {
    var sock;           // socket to server

    this.run = function() {
        console.log(location.host);
        sock = new SockJS('https://' + Config.SERVER_NAME + '/chat');
    }

}

var client = new Client();
client.run();
