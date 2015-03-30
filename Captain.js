function Captain(game,xPos,yPos,sid){
	
    this.hook = game.add.group();
    this.hook.enableBody = true;
    this.hook.physicsBodyType = Phaser.Physics.ARCADE;
    this.hook.createMultiple(50, 'star');
    this.hook.setAll('checkWorldBounds', true);
    //this.hook.setAll('outOfBoundsKill', true);
	
	this.body = game.add.sprite(xPos,yPos,'dude')
	this.body.anchor.set(0.5);
	game.physics.enable(this.body, Phaser.Physics.ARCADE);
	this.body.body.allowRotation = false;
	this.body.body.collideWorldBounds = true;
	
	//Public variables
	this.x;
	this.y;
	this.xVelocity;
	this.yVelocity;
	this.health;
	this.hookID;
	this.teamID;
	this.playerID;
	this.leftOrRight;
	this.hookedPillar;
	this.hookedPlayer;
	
	//Constructor
	var that = this;
	this.x = xPos;
	this.y = yPos;
	this.xVelocity = 0;
	this.yVelocity = 0;
	this.hp = 100;
	this.hookID = sid;
	this.playerID = sid;
	this.teamID = sid%2;
	this.leftOrRight = sid;
	this.hookedPillar = false;
	this.hookedPlayer = false;
	this.xVelocity = this.body.body.velocity.x;
	this.yVelocity = this.body.body.velocity.y;
	
	var isDead = function(){
		if(that.health<=0){
			return true;
		}
		return false;
	}
}

// Public method: takeDmg()
// remark: if two characters are getting nearer, automatically deduct their own HP
Captain.prototype.takeDmg = function(){
	this.hp = this.hp-1;
}

// Public method: respawn()
Captain.prototype.respawn = function(){
	x = xPos;
	y = yPos;
	xVelocity = 0;
	yVelocity = 0;
	hp = 100;
}


//global.Captain = Captain;