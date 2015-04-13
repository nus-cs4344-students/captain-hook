
function Room(_name, _maxPlayer)
{
    console.log("[*] Creating room with params: {" + _name + ":" + _maxPlayer + "}");
    this.name = _name;
    this.maxPlayer = _maxPlayer;
    this.playerCount = 0;
    this.players = [];
    this.roomState = 'WAITING'; // WAITING - READY - PLAYING - FINISHED
    this.roomType = 'Type01'; // Check this in room.js to create more game types

    this.broadCast = function(message, _except)
    {
        this.players.forEach(function(p){
            console.log("> Check " + p.name + " : " + _except.name);
            if (p.name != _except.name)
            {
                p.socket.write(message);
            }
        });
    };

    // Switch state
    this.Wait = function()
    {
        this.roomState = "WAITING";
    };

    this.IsWaiting = function()
    {
        return (this.roomState == "WAITING");
    };

    this.Ready = function()
    {
        this.roomState = "READY";
    };

    this.IsReady = function()
    {
        return (this.roomState == "READY");
    };

    this.Play = function()
    {
        this.roomState = "PLAYING";
    };

    this.IsPlaying = function()
    {
        return (this.roomState == "PLAYING");
    };

    this.Finish = function()
    {
        this.roomState = "FINISHED";
    };

    this.IsFinished = function()
    {
        return (this.roomState == "FINISHED");
    }
}

global.Room = Room;

