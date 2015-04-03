var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    game.load.image('star', 'assets/star.png');
	game.load.image('ground', 'assets/platform_vertical.png');
    // this.load.script('HudManager', '/js/HUDManager.js');
}

var fireRate = 100;
var nextFire = 0;
var cursors;

var that = this;
var player1; // local player
this.hook1;// local hook that is controlable by local player

var arrayOfPlayers = [];
var arrayOfPillar = [];

function create() {

    // this.hud = Phaser.Plugin.HUDManager.create(this.game, this, 'gamehud');

    game.physics.startSystem(Phaser.Physics.ARCADE);
	
	platforms = game.add.group();
	platforms.enableBody = true;
	 
	ledge1 = platforms.create(270, 000, 'ground');
	ledge1.scale.setTo(0.5, 1.5);
    ledge1.body.immovable = true;
	
	ledge2 = platforms.create(520, 000, 'ground');
	ledge2.scale.setTo(0.5, 1.5);
    ledge2.body.immovable = true;
	
	pillar1 = platforms.create(700,100,'ground');
	pillar1.scale.setTo(0.5,0.04);
	pillar1.body.immovable = true;
	
	pillar2 = platforms.create(700,500,'ground');
	pillar2.scale.setTo(0.5,0.04);
	pillar2.body.immovable = true;
	
	pillar3 = platforms.create(150,100,'ground');
	pillar3.scale.setTo(0.5,0.04);
	pillar3.body.immovable = true;
	
	pillar4 = platforms.create(150,500,'ground');
	pillar4.scale.setTo(0.5,0.04);
	pillar4.body.immovable = true;

    game.stage.backgroundColor = '#313131';
	
	cursors = game.input.keyboard.createCursorKeys();
	//server do this, client just nid update positions.
	player1 = new Captain(game,100,300,0);
	arrayOfPlayers[0] = new Captain(game,700,400,1);
	arrayOfPlayers[1] = new Captain(game,100,100,2);
	arrayOfPlayers[2] = new Captain(game,700,200,3);
	arrayOfPillar[0] = pillar1;
	arrayOfPillar[1] = pillar2;
	arrayOfPillar[2] = pillar3;
	arrayOfPillar[3] = pillar4;
}

function update() {
	for(var i=0;i<arrayOfPlayers.length;i++){
		game.physics.arcade.collide(arrayOfPlayers[i].sprite,platforms);
	}
	game.physics.arcade.collide(player1.sprite, platforms);
	if(!player1.hookReturn){
		//check collision between local hook and other player, this part should be in server
		for (var i = 0; i < arrayOfPlayers.length; i++){
			if (game.physics.arcade.collide(that.hook1, arrayOfPlayers[i].sprite)) {
				var playerBeingHooked = arrayOfPlayers[i];

				disableCollision(playerBeingHooked);

				var back1 = setInterval(function() {
					// Player being hooked follows the hook while it goes back to thrower

					game.physics.arcade.moveToObject(that.hook1, player1.sprite, 200);
					game.physics.arcade.moveToObject(playerBeingHooked.sprite, that.hook1, 200);
					if (game.physics.arcade.distanceBetween(that.hook1, player1.sprite) < 15) {
						console.log("reach local player...");
						that.hook1.kill();
						playerBeingHooked.sprite.body.velocity = new Phaser.Point(0,0);
						enableCollision(playerBeingHooked);

						clearInterval(back1);
					}
				},10)
				i = arrayOfPlayers.length;
			}
		}
	
		//check collision between local hook and pillars
		for(var i=0;i<arrayOfPillar.length;i++){
			if(game.physics.arcade.collide(that.hook1,arrayOfPillar[i])){	

				disableCollision(player1);

				that.hook1.body.velocity.x=0;
				that.hook1.body.velocity.y=0;
				var back2 =setInterval(function() {
					game.physics.arcade.moveToObject(player1.sprite,that.hook1,200);
					if(game.physics.arcade.distanceBetween(that.hook1,player1.sprite)<25){
						that.hook1.kill();
						player1.hookedPillar = false;
						player1.sprite.body.velocity = new Phaser.Point(0,0);
						enableCollision(player1);
						clearInterval(back2);
					}
				},10)
				i = arrayOfPillar.length;
			}	
		}
	}

	
	//check the distance between local pudge with all the others,, this part should be in server
	var counter =0;
	for(var i=0;i<arrayOfPlayers.length;i++){
		if(game.physics.arcade.distanceBetween(player1.sprite,arrayOfPlayers[i].sprite)<25){
			if(player1.teamID!=arrayOfPlayers[i].teamID){
				counter++;
				console.log("counter at client:"+counter);
			}
		}
	}
	//console.log("counter at client:"+counter);
	player1.takeDmg(counter);
	//check if the local player is dead
	if(player1.isDead()){
		player1.respawn();
	}
	
	// return local hook back to player
	if(player1.hook.countLiving()>0){
		if(game.physics.arcade.distanceBetween(that.hook1,player1.sprite)>500){
			player1.hookReturn = true;
			game.physics.arcade.moveToObject(that.hook1,player1.sprite,200);
			var back3 =setInterval(function() {	
				game.physics.arcade.moveToObject(that.hook1,player1.sprite,200);
				if(game.physics.arcade.distanceBetween(that.hook1,player1.sprite)<50){
					//console.log("testing");
					player1.hookReturn = false;
					that.hook1.kill();
					clearInterval(back3);
				}
			},10)
		}
	}

    // player1.sprite.rotation = game.physics.arcade.angleToPointer(player1.sprite);
	player1.sprite.body.velocity.x=0;
	player1.sprite.body.velocity.y=0;
	
	//action listener for movement and fire hook
    if (game.input.activePointer.isDown)
    {
        throwHook();
    }
    else if (cursors.left.isDown)
    {
        player1.sprite.body.velocity.x -= 100;
    }
    else if (cursors.right.isDown)
    {
        player1.sprite.body.velocity.x += 100;
    }

    else if (cursors.up.isDown)
    {
        player1.sprite.body.velocity.y -= 100;
    }
    else if (cursors.down.isDown)
    {
        player1.sprite.body.velocity.y += 100;
    }

}

function enableCollision(object) {
	object.sprite.body.checkCollision.right = true;
	object.sprite.body.checkCollision.left = true;
}

function disableCollision(object) {
	object.sprite.body.checkCollision.right = false;
	object.sprite.body.checkCollision.left = false;
}

function throwHook() {

	if(player1.hook.countLiving()<1)
    {
        that.hook1 = player1.hook.getFirstDead();
		
		//set bullet starting position
        hook1.reset(player1.sprite.x - 5, player1.sprite.y - 5);

        game.physics.arcade.moveToPointer(hook1, 300);
		ready = false;
    }
}

function render(pointer) {
    game.debug.text('Active star: ' + player1.hook.countLiving() + ' / ' + player1.hook.total+ " x:"+player1.sprite.x+"	px:"+game.input.x+" HP:"+player1.hp, 32, 32);
    //game.debug.spriteInfo(sprite, 32, 450);
}
