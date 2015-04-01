"use strict";

// Add remove function for arrays
Array.prototype.remove = function(e) {
    for (var i = 0; i < this.length; i++) {
        if (e == this[i]) { return this.splice(i, 1); }
    }
};

// Add find by name function for arrays (to find player or room)
Array.prototype.find = function(name) {
    for (var i = 0; i < this.length; i++) {
        if (name == this[i].name) { return this[i]; }
    }
};

// Add trim feature
String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
String.prototype.ltrim=function(){return this.replace(/^\s+/,'');};
String.prototype.rtrim=function(){return this.replace(/\s+$/,'');};
String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/,'');};

// Add startsWith and endsWidth function for strings
String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0;
};

String.prototype.endsWith = function(suffix) {
    return this.match(suffix+"$") == suffix;
};

// Global Broadcast Function
function BroadcastAll(message, except)
{
    playerList.forEach(function(p){
        if (p != except)
        {
            p.socket.write(message);
        }
    });
}

function GlobalChat(message, except)
{
    if (except.room == null) // Only players in Global lobby can send message
    {
        playerList.forEach(function(p){
            if (p != except && p.room == null) // Only players in Global lobby can receive the message
            {
                p.socket.write(message);
            }
        });
    }
}

