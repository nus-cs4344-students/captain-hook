
var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'captain-hook', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.spritesheet('dude', '../assets/dude.png', 32, 48);
    game.load.image('star', '../assets/star.png');
    game.load.image('ground', '../assets/platform_vertical.png');
}

this.captain;    // local player
this.hook1;      // local hook that is controlable by local player
this.arrayOfPlayer = [];

var arrayOfPillar = [];
var that = this;
var cursors;

var ledge1;
var ledge2;

function create() {
    game.physics.startSystem(Phaser.Physics.ARCADE);

    platforms = game.add.group();
    platforms.enableBody = true;

    ledge1 = platforms.create(270, 000, 'ground');
    ledge1.scale.setTo(0.5, 1.5);
    ledge1.body.immovable = true;

    ledge2 = platforms.create(520, 000, 'ground');
    ledge2.scale.setTo(0.5, 1.5);
    ledge2.body.immovable = true;

    pillar1 = platforms.create(650, 100, 'ground');
    pillar1.scale.setTo(0.5, 0.04);
    pillar1.body.immovable = true;

    pillar2 = platforms.create(650, 500, 'ground');
    pillar2.scale.setTo(0.5, 0.04);
    pillar2.body.immovable = true;

    pillar3 = platforms.create(150, 100, 'ground');
    pillar3.scale.setTo(0.5, 0.04);
    pillar3.body.immovable = true;

    pillar4 = platforms.create(150, 500, 'ground');
    pillar4.scale.setTo(0.5, 0.04);
    pillar4.body.immovable = true;

    game.stage.backgroundColor = '#313131';

    cursors = game.input.keyboard.createCursorKeys();
    that.captain = new Captain(game, 100, 300, 0);    // local player
    //server do this, client just nid update positions.
    arrayOfPillar[0] = pillar1;
    arrayOfPillar[1] = pillar2;
    arrayOfPillar[2] = pillar3;
    arrayOfPillar[3] = pillar4;
}

function update() {
	
    // Check whether every player is collition with all platforms
    for (var i = 0; i < that.arrayOfPlayer.length; i++) {
        game.physics.arcade.collide(that.arrayOfPlayer[i].sprite, platforms);
    }
	if(game.physics.arcade.collide(that.captain.sprite, platforms)){
		that.captain.isCollide = true;
	}
	else{
		that.captain.isCollide = false;
	}


    if (!that.captain.hookReturn) {
        //check collision between local hook and other player, this part should be in server
        for (var i = 0; i < that.arrayOfPlayer.length; i++) {
            if (game.physics.arcade.collide(that.hook1, that.arrayOfPlayer[i].sprite)) {
                var temp = that.arrayOfPlayer[i].sprite;
				that.captain.hookedPlayer = that.arrayOfPlayer[i].playerID;
				
				that.arrayOfPlayer.forEach(function(p) {
					if (p.playerID == that.captain.hookedPlayer) {
						p.beingHooked = true;
					}
				});
				that.arrayOfPlayer[i].disableCollision();
                var back1 = setInterval(function () {
                    game.physics.arcade.moveToObject(that.hook1, that.captain.sprite, 200);
                    game.physics.arcade.moveToObject(temp, that.captain.sprite, 200);
                    if (game.physics.arcade.distanceBetween(that.hook1, that.captain.sprite) < 25) {

                        that.hook1.kill();
						that.captain.hookVelocityX = 0;
						that.captain.hookVelocityY = 0;
						// identify which player has being hooked, set the attribute
						that.arrayOfPlayer.forEach(function(p) {
							if (p.playerID == that.captain.hookedPlayer) {
								p.beingHooked = false;
							}
						});
						that.captain.hookedPlayer=-1;
						
						that.captain.isShooting = false;
                        temp.body.velocity.x = 0;
                        temp.body.velocity.y = 0;
						//that.arrayOfPlayer[i].enableCollision();
                        clearInterval(back1);
                    }
                }, 10)
                i = that.arrayOfPlayer.length;
            }
        }

        //check collision between local hook and pillars
        for (var i = 0; i < arrayOfPillar.length; i++) {
            if (game.physics.arcade.collide(that.hook1, arrayOfPillar[i])) {
				that.captain.beingHooked = true;
				that.captain.disableCollision();
                that.hook1.body.velocity.x = 0;
                that.hook1.body.velocity.y = 0;
                var back2 = setInterval(function () {
                    game.physics.arcade.moveToObject(that.captain.sprite, that.hook1, 200);
                    if (game.physics.arcade.distanceBetween(that.hook1, that.captain.sprite) < 25) {
                        that.hook1.kill();
						that.captain.hookVelocityX = 0;
						that.captain.hookVelocityY = 0;
						that.captain.isShooting = false;
						that.captain.beingHooked = false;
                        that.captain.sprite.body.velocity.x = 0;
                        that.captain.sprite.body.velocity.y = 0;
						that.captain.enableCollision();
                        clearInterval(back2);
                    }
                }, 10)
                i = arrayOfPillar.length;
            }
        }
    }


    //check the distance between local pudge with all the others,, this part should be in server
    var counter = 0;
    for (var i = 0; i < that.arrayOfPlayer.length; i++) {
        if (game.physics.arcade.distanceBetween(that.captain.sprite, that.arrayOfPlayer[i].sprite) < 25) {
            if (that.captain.teamID != that.arrayOfPlayer[i].teamID) {
                counter++;
                //console.log("counter at client:" + counter);
            }
        }
    }

    //console.log("counter at client:"+counter);
    that.captain.takeDmg(counter);
    //check if the local player is dead
    if (that.captain.isDead()) {
        that.captain.respawn();
    }

    // return local hook back to player
	if(that.captain.isShooting){
		if (game.physics.arcade.distanceBetween(that.hook1, that.captain.sprite) > 500) {
            that.captain.hookReturn = true;
            game.physics.arcade.moveToObject(that.hook1, that.captain.sprite, 200);
            var back3 = setInterval(function () {
                game.physics.arcade.moveToObject(that.hook1, that.captain.sprite, 200);
                if (game.physics.arcade.distanceBetween(that.hook1, that.captain.sprite) < 50) {
                    that.captain.hookReturn = false;
                    that.hook1.kill();
					that.captain.hookVelocityX = 0;
					that.captain.hookVelocityY = 0;
                    clearInterval(back3);
                    that.captain.isShooting = false; // the hook is stop shooting
                }
            }, 10)
        }
	}

    //that.captain.sprite.rotation = game.physics.arcade.angleToPointer(that.captain.sprite);
    that.captain.sprite.body.velocity.x = 0;
    that.captain.sprite.body.velocity.y = 0;

    //action listener for movement and fire hook
    if (game.input.activePointer.isDown) {
        fire();
    }
	else if(that.captain.beingHooked){
		that.captain.isMoveing = false;
	}
    else if (cursors.left.isDown) {
        that.captain.sprite.body.velocity.x = -100;
		that.captain.isMoving = true;
    }
    else if (cursors.right.isDown) {
        that.captain.sprite.body.velocity.x = 100;
		that.captain.isMoving = true;
    }

    else if (cursors.up.isDown) {
        that.captain.sprite.body.velocity.y = -100;
		that.captain.isMoving = true;
    }
    else if (cursors.down.isDown) {
        that.captain.sprite.body.velocity.y = 100;
		that.captain.isMoving = true;
    }
	else {
		that.captain.isMoving = false;
	}
		
}

function fire() {
	
	if(!that.captain.isShooting){
		that.captain.isShooting=true;
		that.captain.createHook(that.captain.sprite.x,that.captain.sprite.y);
		that.hook1 = that.captain.hook;
		game.physics.arcade.moveToPointer(that.hook1,300);
		that.captain.hookVelocityX = that.captain.hook.body.velocity.x/1.496;
		that.captain.hookVelocityY = that.captain.hook.body.velocity.y/1.496;
		that.captain.hookSourceX = that.captain.sprite.x;
		that.captain.hookSourceY = that.captain.sprite.y;
		that.captain.hookDestinationX = game.input.x;
		that.captain.hookDestinationY = game.input.y;
	}
}

function render(pointer) {
    game.debug.text('Active star: ' + that.captain.isShooting + " x:" + that.captain.sprite.x + "	y:" + that.captain.sprite.y + " player ID:" + that.captain.playerID + " total other players:" + that.arrayOfPlayer.length+ " HP:" + that.captain.hp, 32, 32);
	game.debug.text("being hooked: "+that.captain.beingHooked+" is moving: "+ that.captain.isMoving +" is collide: " + that.captain.isCollide,32,50);
	game.debug.text("hvx: "+that.captain.hookVelocityX+" hvy: "+ that.captain.hookVelocityY,32,68);
    //game.debug.spriteInfo(sprite, 32, 450);
}

// Get local player
function getLocalPlayer() {
    return that.captain;
};

function getHookedPlayer() {
	this.arrayOfPlayer.forEach(function(p) {
			if (p.beingHooked) {
				return p;
			}
	});
	return undefined;
};

function getLocalHook() {
	return this.hook1;
};

function agreeJoin(_x, _y, _pid) {
    this.captain.init(_x, _y, _pid);
    this.captain.sprite.x = _x;
    this.captain.sprite.y = _y;
};

function addPlayer(_x, _y,_pid) {
    this.arrayOfPlayer.push(new Captain(this.game, _x, _y, _pid));
};

function updatePlayerPosition(_x, _y, pid) {
	if (pid == this.captain.playerID) {
		this.captain.sprite.x = _x;
		this.captain.sprite.y = _y;
	} else {
		this.arrayOfPlayer.forEach(function(p) {
			if (p.playerID == pid) {
				p.sprite.x = _x;
				p.sprite.y = _y;
			}
		});
	}
};

function clearAllPlayers() {
    this.arrayOfPlayer.forEach(function(p) {
		p.sprite.kill();
        delete p;
    });
};

function removePlayer(pid) {
    this.arrayOfPlayer.forEach(function(p) {
        if (p.playerID == pid) {
			p.sprite.kill();
            delete p;
        }
    });
};

function updateHookPosition(_x, _y, _pid) {
	//this.arrayOfPlayer.forEach(function(p){
	for(var i=0;i<this.arrayOfPlayer.length;i++){
		var p = this.arrayOfPlayer[i];
		if (p.playerID == _pid) {
			if (!p.isShooting) {
				p.createHook(p.sprite.x+5,p.sprite.y+5);
			}
			p.setHookPosition(_x,_y);
			
			if(game.physics.arcade.distanceBetween(p.sprite,p.hook)<30){
				p.killHook();
			}
		}
	}
};

