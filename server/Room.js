
function Room(_name, _maxPlayer, _sockets)
{
    console.log("[*] Creating room with params: {" + _name + ":" + _maxPlayer + "}");
    this.name = _name;
    this.maxPlayer = _maxPlayer;
    this.playerCount = 0;
    this.team1Count = 0;
    this.team0Count = 0;

    this.room_players = {}; // Associative array for room_players, indexed via socket ID

    this.sockets = _sockets;

    this.team1Score = 0;
    this.team0Score = 0;

    this.gameLoop = function() {
        //update game states for each player
        var p1;
        var p2;
        for(var i in this.room_players){
            p1 = this.room_players[i];
            if(p1.isShoot){
                if(p1.hookPillar){
                    p1.calculatePositionByPillar(p1.hx,p1.hy);
                }
                else{
                    for(var j in this.room_players){
                        p2 = this.room_players[j];
                        if(p1.pid!=p2.pid){
                            //if(!p2.beingHooked){
                            if(distanceBetweenTwoPoints(p1.hx,p1.hy,p2.x,p2.y)<10){
                                if(p1.teamID!=p2.teamID){
                                    //console.log("player "+p1.pid+"(teamID:"+p1.teamID+") hooked player "+p2.pid+"(teamID:"+p2.teamID+")");
                                    p2.hp--;//a bit different from real pudge war, being hooked will take damage.
                                }
                                p1.hookReturn = true;
                                p2.beingHooked = true;
                                p2.calculatePositionByHook(p1.x,p1.y);
                            }
                            //}
                        }
                    }
                    p1.calculateHookPosition();
                }
            }
        }

        for(var i in this.room_players){
            p1 = this.room_players[i];
            for(var j in this.room_players){
                p2 = this.room_players[j];
                if(distanceBetweenTwoPoints(p1.x,p1.y,p2.x,p2.y)<20){
                    if(p1.teamID!=p2.teamID){
                        p1.hp--;
                    }
                }
            }
        }

        for(var i in this.room_players){
            p = this.room_players[i];
            if(p.isFallInRiver()){
                p.hp -= 0.2;
            }
        }

        //respawn if any player's hp reach 0
        for(var i in this.room_players){
            var p = this.room_players[i];
            p.respawn = false;
            if(p.hp<1){
                p.x = p.initialX;
                p.y = p.initialY;
                console.log(p.x);
                console.log(p.y);
                p.hp = 100;
                p.respawn = true;
                p.beingHooked = false;
                p.hookReturn = false;
                p.killHook = false;
                p.isShoot = false;
                p.hookPillar = false;
                if(p.teamID==0){
                    this.team1Score++;
                }
                else{
                    this.team0Score++;
                }
            }
        }

        var date = new Date();
        var currentTime = date.getTime();
        var maxDelay = 0;
        for(var i in this.room_players){
            if(this.room_players[i].delay>maxDelay){
                maxDelay = this.room_players[i].delay;
            }
        }
        for(var i in this.room_players){
            var p = this.room_players[i];
            var playerTeamScore;
            var opponentTeamScore;
            if(p.teamID==1){
                playerTeamScore=this.team1Score;
                opponentTeamScore = this.team0Score;
            }
            else{
                playerTeamScore=this.team0Score;
                opponentTeamScore = this.team1Score;
            }
            if(currentTime>p.lastUpdate){
                p.lastUpdate = currentTime;
            }
            var states = {
                type:"update",
                id: p.pid,
                hp: p.hp,
                x: p.x,
                y: p.y,
                hx:p.hx,
                hy:p.hy,
                beingHooked: p.beingHooked,
                hookReturn: p.hookReturn,
                killHook: p.killHook,
                isShoot: p.isShoot,
                respawn:p.respawn,
                teamID: p.teamID,
                playerTeamScore:playerTeamScore,
                opponentTeamScore:opponentTeamScore,
                playerDelay:p.delay,
                timestamp:currentTime
            };


            for(var j in this.room_players){
                var delay = this.room_players[j].getDelay();
                var pid = this.room_players[j].pid;
                var calculatedDelay = delay+Math.abs(maxDelay-delay);
                setTimeout(unicast,calculatedDelay,this.sockets[pid],states);
            }
        }
    };

    /*
     * private method: unicast(socket, msg)
     *
     * unicast takes in a socket and a JSON structure
     * and send the message through the given socket.
     *
     * e.g., unicast(socket, {type: "abc", x: 30});
     */
    var unicast = function (socket, msg) {
        socket.write(JSON.stringify(msg));
    };

    function distanceBetweenTwoPoints(x1,y1,x2,y2){
        var diffX = x1-x2;
        var diffY = y1-y2;

        var distance = Math.sqrt(diffX*diffX+diffY*diffY);
        return distance;
    }

}

global.Room = Room;

