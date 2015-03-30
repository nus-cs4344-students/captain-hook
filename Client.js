var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    game.load.image('star', 'assets/star.png');
	game.load.image('ground', 'assets/platform_vertical.png');
}

var fireRate = 100;
var nextFire = 0;
var cursors;

var that = this;
var player1; // local player
this.hook1;// local hook that is controlable by local player

var arrayOfPlayer = [];
var player2;
var player3;
var player4;
var arrayOfPillar = [];

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
	
	player1 = new Captain(game,100,300,0);
	player2 = new Captain(game,700,400,1);
	player3 = new Captain(game,100,100,2);
	player4 = new Captain(game,700,200,3);
	arrayOfPlayer[0] = player2;
	arrayOfPlayer[1] = player3;
	arrayOfPlayer[2] = player4;
	arrayOfPillar[0] = pillar1;
	arrayOfPillar[1] = pillar2;
	arrayOfPillar[2] = pillar3;
	arrayOfPillar[3] = pillar4;
}

function update() {
	for(var i=0;i<arrayOfPlayer.length;i++){
		game.physics.arcade.collide(arrayOfPlayer[i].body,platforms);
	}
	game.physics.arcade.collide(player1.body, platforms);
	//check collision between local hook and other player, this part should be in server
	for(var i=0;i<arrayOfPlayer.length;i++){
		if(game.physics.arcade.collide(that.hook1,arrayOfPlayer[i].body)){
			var temp = arrayOfPlayer[i].body;
			if((player1.body.x<270)&&(that.hook1.x>520)){
				ledge1.body.checkCollision.right = false;
				ledge2.body.checkCollision.right = false;
			}
			else if((player1.body.x>520)&&(that.hook1.x<270)){
				ledge1.body.checkCollision.left = false;
				ledge2.body.checkCollision.left = false;
			}
			var back1 =setInterval(function() {
				game.physics.arcade.moveToObject(that.hook1,player1.body,200);
				game.physics.arcade.moveToObject(temp,player1.body,200);
				if(game.physics.arcade.distanceBetween(that.hook1,player1.body)<25){
					that.hook1.kill();
					temp.body.velocity.x = 0;
					temp.body.velocity.y = 0;
					ledge1.body.checkCollision.left=true;
					ledge2.body.checkCollision.left=true;
					ledge1.body.checkCollision.right = true;
					ledge2.body.checkCollision.right = true;
					clearInterval(back1);
				}
			},10)
			i = arrayOfPlayer.length;
		}
	}
	
	//check the distance between local pudge with all the others,, this part should be in server
	for(var i=0;i<arrayOfPlayer.length;i++){
		if(game.physics.arcade.distanceBetween(player1.body,arrayOfPlayer[i].body)<25){
			if(player1.teamID!=arrayOfPlayer[i].teamID){
				player1.takeDmg();
			}
		}
	}
	
	//check collision between local hook and pillars
	for(var i=0;i<arrayOfPillar.length;i++){
		if(game.physics.arcade.collide(that.hook1,arrayOfPillar[i])){	
			if((player1.body.x<270)&&(that.hook1.x>520)){
				ledge1.body.checkCollision.left = false;
				ledge2.body.checkCollision.left = false;
			}
			else if((player1.body.x>520)&&(that.hook1.x<270)){
				ledge1.body.checkCollision.right = false;
				ledge2.body.checkCollision.right = false;
			}
			that.hook1.body.velocity.x=0;
			that.hook1.body.velocity.y=0;
			var back2 =setInterval(function() {
				game.physics.arcade.moveToObject(player1.body,that.hook1,200);
				if(game.physics.arcade.distanceBetween(that.hook1,player1.body)<25){
					that.hook1.kill();
					player1.hookedPillar = false;
					player1.body.body.velocity.x=0;
					player1.body.body.velocity.y=0;
					ledge1.body.checkCollision.left=true;
					ledge2.body.checkCollision.left=true;
					ledge1.body.checkCollision.right = true;
					ledge2.body.checkCollision.right = true;
					clearInterval(back2);
				}
			},10)
			i = arrayOfPillar.length;
		}	
	}
	
	// return local hook back to player
	if(player1.hook.countLiving()>0){
		if(game.physics.arcade.distanceBetween(that.hook1,player1.body)>500){
			game.physics.arcade.moveToObject(that.hook1,player1.body,200);
			var back3 =setInterval(function() {	
				game.physics.arcade.moveToObject(that.hook1,player1.body,200);
				if(game.physics.arcade.distanceBetween(that.hook1,player1.body)<3){
					//console.log("testing");
					that.hook1.kill();
					clearInterval(back3);
				}
			},10)
		}
	}

    player1.body.rotation = game.physics.arcade.angleToPointer(player1.body);
	player1.body.body.velocity.x=0;
	player1.body.body.velocity.y=0;
	
	//action listener for movement and fire hook
    if (game.input.activePointer.isDown)
    {
        fire();
    }
    else if (cursors.left.isDown)
    {
        player1.body.body.velocity.x -= 100;
    }
    else if (cursors.right.isDown)
    {
        player1.body.body.velocity.x += 100;
    }

    else if (cursors.up.isDown)
    {
        player1.body.body.velocity.y -= 100;
    }
    else if (cursors.down.isDown)
    {
        player1.body.body.velocity.y += 100;
    }

}

function fire() {

	if(player1.hook.countLiving()<1)
    {
        that.hook1 = player1.hook.getFirstDead();
		
		//set bullet starting position
        hook1.reset(player1.body.x - 5, player1.body.y - 5);

        game.physics.arcade.moveToPointer(hook1, 300);
		ready = false;
    }
}

function render(pointer) {
	
	
    game.debug.text('Active star: ' + player1.hook.countLiving() + ' / ' + player1.hook.total+ " x:"+player1.body.x+"	px:"+game.input.x+" HP:"+player1.hp, 32, 32);
    //game.debug.spriteInfo(sprite, 32, 450);
}