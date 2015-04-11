
function Player(_x, _y, _pid, _socket)
{
    this.x = _x;
    this.y = _y;
	this.initialX = _x;
	this.initialY = _y;
	this.vx = 0;
	this.vy = 0;
	this.hx;
	this.hy;
	this.beingHooked = false;
	this.hookReturn = false;
	this.killHook = false;
	this.isShoot = false;
	this.hookPillar = false;
	this.readyFlag = true;
	this.targetX;
	this.targetY;
	this.directionX;
	this.directionY;
	this.hp = 100;
    this.name = _pid;
    this.pid = _pid;
	this.teamID = _pid;
    this.room = null;
    this.socket = _socket;
    this.is_ready = false;
	this.delay = 0;
	this.lastUpdate = new Date().getTime();

	this.getDelay = function() {
        var errorPercentage = 20;
        var to = this.delay + errorPercentage*this.delay/100;
        var from = this.delay - errorPercentage*this.delay/100;
        if (this.delay != 0) {
            return Math.floor(Math.random() * (to - from + 1) + from);
        } else {
            return 0;
        }
    };
	
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
    };
	//--------template for shiyu client reply-------------------------
	/*
		when player press any arrow key, client sends movement packet to server. server checks whether this client is being hooked, if not run calculatePositionByDirection(); if yes run calculatePositionByHook().
	*/
	this.calculatePositionByDirection = function(direction){
		var tempX = this.x;
		var tempY = this.y;
		if(!this.beingHooked){
			//if(!collideWithPillars(this.x,this.y)){
				if(direction=="left"){
					this.x+=(-60)*0.02602;
				}
				else if(direction=="right"){
					this.x+=(60)*0.02602;
				}
				else if(direction=="up"){
					this.y+=(-60)*0.02602;
				}
				else if(direction=="down"){
					this.y+=(60)*0.02602;
				}
			//}
		}
		//check collision with river
		if(collideWithRiver(this.x,this.y)){
			this.x = tempX;
			this.y = tempY;
		}
		//check collision with pillar
		if(collideWithPillars(this.x,this.y)){
			this.x = tempX;
			this.y = tempY;
		}
		//check collision with world boundary
		if(this.x<20){
			this.x = 20;
		}
		if(this.y<15){
			this.y = 15;
		}	
		if(this.x>780){
			this.x = 780;
		}
		if(this.y>585){
			this.y = 585;
		}
	};
	
	this.calculatePositionByHook = function(_x,_y){
		if(distanceBetweenTwoPoints(_x,_y,this.x,this.y)<40){
			this.beingHooked = false;
		}
		else{
			var vectorX = _x - this.x;
			var vectorY = _y - this.y;
			var magnitude = Math.sqrt(vectorX*vectorX+vectorY*vectorY);
			vectorX = vectorX/magnitude;
			vectorY = vectorY/magnitude;
			this.x += 0.02602 * vectorX * 500;
			this.y += 0.02602 * vectorY * 500;
		}
	};
	
	this.calculatePositionByPillar = function(_hx,_hy){
		if(distanceBetweenTwoPoints(_hx,_hy,this.x,this.y)<30){
			this.hookPillar = false;
			this.hookReturn =false;
			this.killHook = true;
			this.isShoot = false;
			this.beingHooked = false;
			//console.log("hook is killed because approached pillar");
		}
		else{
			var vectorX = _hx - this.x;
			var vectorY = _hy - this.y;
			var magnitude = Math.sqrt(vectorX*vectorX+vectorY*vectorY);
			vectorX = vectorX/magnitude;
			vectorY = vectorY/magnitude;
			this.x += 0.02602 * vectorX * 500;
			this.y += 0.02602 * vectorY * 500;
		}

	};
	
	/*
		when player click LMB to throw out hook, client sends throwhook packet to server with the target coordinate.*client will keep sending throwhook packet until it returned to the player.* server call calculateHookPosition() to simulate the hook.
	*/
	this.setHookTarget = function(_px,_py){
		if(!this.isShoot){
			this.targetX = _px;
			this.targetY = _py;
			this.hx = this.x;
			this.hy = this.y;
			this.isShoot = true;
			this.directionX = this.targetX-this.hx;
			this.directionY = this.targetY-this.hy;	
			var magnitude = Math.sqrt(this.directionX*this.directionX+this.directionY*this.directionY);
			this.directionX = this.directionX/magnitude;
			this.directionY = this.directionY/magnitude;

		}
	};
	this.calculateHookPosition = function (){
		this.killHook = false;

		if(!this.hookReturn){
			if(distanceBetweenTwoPoints(this.hx,this.hy,this.x,this.y)>500){
				this.hookReturn =true;
			}
			else if(collideWithPillars(this.hx,this.hy)){
				//console.log("hook pillar");
				this.hookPillar = true;
				this.beingHooked = true;
			}
			else{			
				//console.log("hook throwing out");
				this.hx += 0.02602 * this.directionX * 500;
				this.hy += 0.02602 * this.directionY * 500;
			}
			//return hook

		}
		else{			
			//console.log("hook returning");
			this.directionX = this.x-this.hx;
			this.directionY = this.y-this.hy;
			var magnitude = Math.sqrt(this.directionX*this.directionX+this.directionY*this.directionY);
			this.directionX = this.directionX/magnitude;
			this.directionY = this.directionY/magnitude;
			this.hx += 0.02602 * this.directionX * 500;
			this.hy += 0.02602 * this.directionY * 500;
			//kill hook
			if(distanceBetweenTwoPoints(this.hx,this.hy,this.x,this.y)<20){
				//console.log("hook is killed because it returned");
				this.hx = this.x;
				this.hy = this.y;
				this.hookReturn =false;
				this.killHook = true;
				this.isShoot = false;
			}
		}
	};
	


//--------------------------------------------
}

function collideWithPillars(_x,_y){
	if(distanceBetweenTwoPoints(_x,_y,660,125)<15){
		return true;
	}
	else if(distanceBetweenTwoPoints(_x,_y,660,500)<15){
		return true;
	}
	else if(distanceBetweenTwoPoints(_x,_y,150,110)<15){
		return true;
	}
	else if(distanceBetweenTwoPoints(_x,_y,150,500)<15){
		return true;
	}
	else{
		return false;
	}
}

function collideWithRiver(_x,_y){
	if(distanceBetweenTwoPoints(_x,_y,260,_y)<10){
		return true;
	}
	else if(distanceBetweenTwoPoints(_x,_y,540,_y)<10){
		return true;
	}
	else{
		return false;
	}
}

function distanceBetweenTwoPoints(x1,y1,x2,y2){
	var diffX = x1-x2;
	var diffY = y1-y2;
	
	var distance = Math.sqrt(diffX*diffX+diffY*diffY);
	//console.log(distance);
	return distance;
}
global.Player = Player;
