
function LobbyClient() {
    var sock;           // socket to server
    var player_size = 0;

    this.run = function() {
        console.log(location.host);
        sock = new SockJS('http://' + Config.SERVER_NAME + '/captain');

        sock.onmessage = function (e) {
            var message = JSON.parse(e.data);
            //console.log('Client received : ' + e.data);
            switch (message.type) {
                case "new_lobby_player":
                    var text = message.name + ' joined!';
                    document.getElementById('chatarea').value = document.getElementById('chatarea').value +'\nInfo : ' + text;
                    break;
                case 'player_disconnection':
                    var text = message.name + ' disconnected!';
                    document.getElementById('chatarea').value = document.getElementById('chatarea').value +'\nInfo : ' + text;
                    break;
                case "incomming_msg":
                    var text = message.name + ' says : ' + message.msg;
                    document.getElementById('chatarea').value = document.getElementById('chatarea').value +'\n' + text;
                    break;

                case "update_player_list":
                    var players = message.list;
                    var ui = document.getElementById('player_list');

                    if (player_size != players.length) {
                        $(ui).empty();

                        players.forEach(function (p) {
                            var item = document.createElement('div');
                            item.class = 'item';
                            var image = document.createElement('img');
                            image.class = 'ui avatar image';
                            image.src = 'assets/daniel.jpg';

                            var header_div = document.createElement('div');
                            header_div.class = 'content';

                            var header = document.createElement('div');
                            header.class = 'header';
                            header.textContent = p;

                            header_div.appendChild(header);

                            item.appendChild(image);
                            ui.appendChild(item);
                            ui.appendChild(header_div);
                            console.log(p);
                        });
                        player_size = players.length;
                    }

                    break;

                default:
                    console.log("error: undefined command " + message.type);
            }

        }
    };

    this.sendChatMessage = function() {
        var text = document.getElementById('message_input').value;
        sendToServer({
            type: 'chat',
            msg: text
        });

        document.getElementById('chatarea').value = document.getElementById('chatarea').value +'\nme > ' + text;

        document.getElementById('message_input').value = '';
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
        var date = new Date();
        var currentTime = date.getTime();
        msg["timestamp"] = currentTime;
        sock.send(JSON.stringify(msg));
    }
}

var client = new LobbyClient();
client.run();
