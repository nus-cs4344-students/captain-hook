function Captain(game,xPos,yPos,sid){
	
	/*
    this.hook = game.add.group();
    this.hook.enableBody = true;
    this.hook.physicsBodyType = Phaser.Physics.ARCADE;
    this.hook.createMultiple(50, 'star');
    this.hook.setAll('checkWorldBounds', true);	
	*/
	
	this.hook;
	
	this.body = game.add.sprite(xPos,yPos,'dude')
	this.body.anchor.set(0.5);
	game.physics.enable(this.body, Phaser.Physics.ARCADE);
	this.body.body.allowRotation = false;
	this.body.body.collideWorldBounds = true;
	
	//Public variables
	this.initialX;
	this.initialY;
	this.isMoving = false;
	this.xVelocity;
	this.yVelocity;
	this.health;
	this.hookID;
	this.teamID;
	this.playerID;
	this.leftOrRight;
	this.hookedPlayer;
	this.hookReturn;
	this.isShooting = false;
	this.beingHooked = false;
	//Constructor
	this.initialX = xPos;
	this.initialY = yPos;
	this.xVelocity = 0;
	this.yVelocity = 0;
	this.hp = 100;
	this.hookID = sid;
	this.playerID = sid;
	this.teamID = sid%2;
	this.leftOrRight = sid;
	this.hookedPlayer = -1;
	this.xVelocity = this.body.body.velocity.x;
	this.yVelocity = this.body.body.velocity.y;
	this.hookReturn =false;
	
	/*
	this.hud = Phaser.Plugin.HUDManager.create(game, this, 'captainHUD');
  	this.healthHUD = this.hud.addBar(0,-20, 32, 2, 100, 'hp', this, Phaser.Plugin.HUDManager.HEALTHBAR, false);
  	this.healthHUD.bar.anchor.setTo(0.5, 0.5);
  	this.sprite.addChild(this.healthHUD.bar);
	*/
	
	this.init = function(xPos, yPos, sid) {
		this.initialX = xPos;
		this.initialY = yPos;
		this.hookID = sid;
		this.playerID = sid;
		this.teamID = sid%2;
		this.leftOrRight = sid;
	};

	this.isDead = function(){
		if(this.hp<=0){
			return true;
		}
		return false;
	}
	
	this.createHook = function(_x,_y){
		this.hook = game.add.sprite(_x+10,_y+10,'star');
		this.hook.anchor.set(0.5);
		game.physics.enable(this.hook,Phaser.Physics.ARCADE);
		this.hook.body.collideWorldBounds = false;
	}

}

// Public method: takeDmg()
// remark: if two characters are getting nearer, automatically deduct their own HP
Captain.prototype.takeDmg = function(counter){
	this.hp = this.hp-1*counter;
	//console.log("number of nearer opponents: "+counter);
}

// Public method: respawn()
Captain.prototype.respawn = function(){
	//console.log("character respawned");
	this.x = this.initialX;
	this.y = this.initialY;
	this.body.body.x = this.initialX;
	this.body.body.y = this.initialY;
	this.xVelocity = 0;
	this.yVelocity = 0;
	this.hp = 100;
}
