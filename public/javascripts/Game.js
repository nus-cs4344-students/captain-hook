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

    pillar1 = platforms.create(700, 100, 'ground');
    pillar1.scale.setTo(0.5, 0.04);
    pillar1.body.immovable = true;

    pillar2 = platforms.create(700, 500, 'ground');
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
        game.physics.arcade.collide(that.arrayOfPlayer[i].body, platforms);
    }

    game.physics.arcade.collide(that.captain.body, platforms);

    if (!that.captain.hookReturn) {
        //check collision between local hook and other player, this part should be in server
        for (var i = 0; i < that.arrayOfPlayer.length; i++) {
            if (game.physics.arcade.collide(that.hook1, that.arrayOfPlayer[i].body)) {
                var temp = that.arrayOfPlayer[i].body;
                if ((that.captain.body.x < 270) && (that.hook1.x > 520)) {
                    ledge1.body.checkCollision.right = false;
                    ledge2.body.checkCollision.right = false;
                }
                else if ((that.captain.body.x > 520) && (that.hook1.x < 270)) {
                    ledge1.body.checkCollision.left = false;
                    ledge2.body.checkCollision.left = false;
                }
                var back1 = setInterval(function () {
                    game.physics.arcade.moveToObject(that.hook1, that.captain.body, 200);
                    game.physics.arcade.moveToObject(temp, that.captain.body, 200);
                    if (game.physics.arcade.distanceBetween(that.hook1, that.captain.body) < 25) {
                        //console.log("reach local player...");
                        that.hook1.kill();
                        temp.body.velocity.x = 0;
                        temp.body.velocity.y = 0;
                        ledge1.body.checkCollision.left = true;
                        ledge2.body.checkCollision.left = true;
                        ledge1.body.checkCollision.right = true;
                        ledge2.body.checkCollision.right = true;
                        clearInterval(back1);
                    }
                }, 10)
                i = that.arrayOfPlayer.length;
            }
        }

        //check collision between local hook and pillars
        for (var i = 0; i < arrayOfPillar.length; i++) {
            if (game.physics.arcade.collide(that.hook1, arrayOfPillar[i])) {
                if ((that.captain.body.x < 270) && (that.hook1.x > 520)) {
                    ledge1.body.checkCollision.left = false;
                    ledge2.body.checkCollision.left = false;
                }
                else if ((that.captain.body.x > 520) && (that.hook1.x < 270)) {
                    ledge1.body.checkCollision.right = false;
                    ledge2.body.checkCollision.right = false;
                }
                that.hook1.body.velocity.x = 0;
                that.hook1.body.velocity.y = 0;
                var back2 = setInterval(function () {
                    game.physics.arcade.moveToObject(that.captain.body, that.hook1, 200);
                    if (game.physics.arcade.distanceBetween(that.hook1, that.captain.body) < 25) {
                        that.hook1.kill();
                        that.captain.hookedPillar = false;
                        that.captain.body.body.velocity.x = 0;
                        that.captain.body.body.velocity.y = 0;
                        ledge1.body.checkCollision.left = true;
                        ledge2.body.checkCollision.left = true;
                        ledge1.body.checkCollision.right = true;
                        ledge2.body.checkCollision.right = true;
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
        if (game.physics.arcade.distanceBetween(that.captain.body, that.arrayOfPlayer[i].body) < 25) {
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
    if (that.captain.hook.countLiving() > 0) {
        that.captain.isShooting = true; // the hook is shooting
        if (game.physics.arcade.distanceBetween(that.hook1, that.captain.body) > 500) {
            that.captain.hookReturn = true;
            game.physics.arcade.moveToObject(that.hook1, that.captain.body, 200);
            var back3 = setInterval(function () {
                game.physics.arcade.moveToObject(that.hook1, that.captain.body, 200);
                if (game.physics.arcade.distanceBetween(that.hook1, that.captain.body) < 50) {
                    that.captain.hookReturn = false;
                    that.hook1.kill();
                    clearInterval(back3);
                    that.captain.isShooting = false; // the hook is stop shooting
                }
            }, 10)
        }
    }

    that.captain.body.rotation = game.physics.arcade.angleToPointer(that.captain.body);
    that.captain.body.body.velocity.x = 0;
    that.captain.body.body.velocity.y = 0;

    //action listener for movement and fire hook
    if (game.input.activePointer.isDown) {
        fire();
    }
    else if (cursors.left.isDown) {
        that.captain.body.body.velocity.x -= 100;
    }
    else if (cursors.right.isDown) {
        that.captain.body.body.velocity.x += 100;
    }

    else if (cursors.up.isDown) {
        that.captain.body.body.velocity.y -= 100;
    }
    else if (cursors.down.isDown) {
        that.captain.body.body.velocity.y += 100;
    }
}

function fire() {

    if (that.captain.hook.countLiving() < 1) {
        that.hook1 = that.captain.hook.getFirstDead();

        //set bullet starting position
        that.hook1.reset(that.captain.body.x - 5, that.captain.body.y - 5);

        game.physics.arcade.moveToPointer(that.hook1, 300);
    }
}

function render(pointer) {
    game.debug.text('Active star: ' + that.captain.hook.countLiving() + ' / ' + that.captain.hook.total + " x:" + that.captain.body.x + "	px:" + game.input.x + " HP:" + that.captain.hp, 32, 32);
    //game.debug.spriteInfo(sprite, 32, 450);
}

// Get local player
function getLocalPlayer() {
    return that.captain;
};

function agreeJoin(_x, _y, _pid) {
    that.captain.init(_x, _y, _pid);
    that.captain.body.x = _x;
    that.captain.body.y = _y;
    console.log('ok');
};

function addPlayer(x, y, pid) {
    this.arrayOfPlayer.push(new Captain(this.game, x, y, pid));
};

function updatePlayerPosition(_x, _y, pid) {
    this.arrayOfPlayer.forEach(function(p) {
        if (p.playerID == pid) {
            p.body.x = _x;
            p.body.y = _y;
        }
    });
};

function clearAllPlayers() {
    this.arrayOfPlayer.forEach(function(p) {
        delete p;
    });
};


function removePlayer(pid) {
    this.arrayOfPlayer.forEach(function(p) {
        if (p.playerID == pid) {
            delete p;
        }
    });
};

function updateHookPosition(_x, _y, _pid) {
    this.arrayOfPlayer.forEach(function(p){
        if (p.playerID == _pid) {
            var hook = p.hook;
            if (hook.countLiving() < 1) {
                hook = hook.getFirstDead();
                //set bullet starting position
                hook.reset(p.body.x - 5, p.body.y - 5);
            }
            hook.body.x = _x;
            hook.body.y = _y;
        }
    });
};

