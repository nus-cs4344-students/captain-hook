
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

                    var item = document.createElement('div');
                    item.className = 'ui yellow message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.addFrame(item);
                    box.scrollTop = box.scrollHeight;

                    break;

                case 'given_name':
                    var text = 'Your name is ' + message.name;

                    var item = document.createElement('div');
                    item.className = 'ui pink message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.addFrame(item);
                    box.scrollTop = box.scrollHeight;

                    break;

                case 'player_disconnection':
                    var text = message.name + ' disconnected!';

                    var item = document.createElement('div');
                    item.className = 'ui red message';
                    item.textContent = text;

                    var box = document.getElementById('chatarea');
                    box.appendChild(item);
                    box.addFrame(item);
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

                case "update_player_list":
                    var players = message.list;
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

                    break;

                default:
                    console.log("error: undefined command " + message.type);
            }

        }
    };

    this.sendJoinRoomMsg = function(room_id) {
        var link = 'http://' + Config.SERVER_NAME + '/' + room_id;
        window.location.replace(link);
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
