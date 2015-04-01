"use strict";

function Player(_x, _y, _pid, _socket)
{
    this.x = _x;
    this.y = _y;
    this.name = _pid;
    this.pid = _pid;
    this.room = null;
    this.socket = _socket;
    this.is_ready = false;

    this.Ready = function()
    {
        if (this.room != null)
        {
            this.is_ready = true;
            this.room.broadCast("[PLAYERREADY;" + this.name + "]", this); // Send ready message to all players
        }
    };

    this.Cancel = function()
    {
        if (this.room != null)
        {
            this.is_ready = false;
            this.room.broadCast("[PLAYERCANCEL;" + this.name + "]", this); // Send cancel message to all players
        }
    };

    this.joinRoom = function(roomName)
    {
        var cplayer = this;
        var roomExist = false;
        roomList.forEach(function(r){
            if (r.name == roomName)
            {
                roomExist = true;
                console.log("> ROOM EXIST! Count:" + r.playerCount + " / " + r.maxPlayer);
                if (r.playerCount < r.maxPlayer)
                {
                    r.players.push(cplayer);
                    r.playerCount++;
                    // Switch room state
                    if (r.playerCount < r.maxPlayer)
                    {
                        r.Wait(); // Still waiting for players
                    }
                    else
                    {
                        if (r.IsWaiting()) r.Ready(); // Switch to ready state
                    }
                    cplayer.room = r;
                    console.log("[!] " + cplayer.name + " joined room " + r.name);
                    r.broadCast("[JOINROOM;" + cplayer.name + "]", cplayer);
                    cplayer.socket.write("[JOINEDROOM;" + r.name + "]");
                }
                else
                {
                    cplayer.socket.write("[ROOMFULL;" + r.name + "]");
                    console.log("[!] Room " + r.name + " is full");
                }
            }
        });
        if (roomExist == false)
        {
            cplayer.socket.write("[NOROOM;" + roomName + "]");
            console.log("[!] Room " + roomName + " not found");
        }
    };

    this.leaveRoom = function()
    {
        if (this.room != null)
        {
            this.room.players.remove(this);
            this.room.playerCount--;
            if (this.room.playerCount < this.room.maxPlayer)
            {
                this.room.Wait();
            }
            this.room.broadCast("[LEFTROOM;" + this.name + "]", this);
            console.log("[!] " + this.name + " left room " + this.room.name);
            this.room = null;
        }
    }
}

global.Player = Player;
