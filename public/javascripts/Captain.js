function Captain(game,xPos,yPos,sid,tid){
	this.hook;
	
	// Initialize Captain's Sprite
	this.sprite;
	if (tid == 0) {
		this.sprite = game.add.sprite(xPos,yPos,'captain1');
	} else {
		this.sprite = game.add.sprite(xPos,yPos,'captain2');
	}	
	this.sprite.anchor.set(0.5);
	game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
	this.sprite.body.allowRotation = false;
	this.sprite.body.collideWorldBounds = true;

	this.sprite.animations.add('up', [36, 37, 38], 10, true);
	this.sprite.animations.add('down', [0, 1, 2], 10, true);

	this.sprite.animations.add('left', [12, 13, 14], 10, true);
	this.sprite.animations.add('right', [24, 25, 26], 10, true);

	//this.sprite.frame = 13;

	game.world.bringToTop(this.sprite);

	//Constructor
	this.initialX = xPos;
	this.initialY = yPos;
	this.xVelocity = 0;
	this.yVelocity = 0;
	this.hp = 100;
	this.hookID = sid;
	this.playerID = sid;
	this.teamID = tid;		// determined by server
	this.leftOrRight = sid;
	this.hookedPlayer = -1;
	this.xVelocity = this.sprite.body.velocity.x;
	this.yVelocity = this.sprite.body.velocity.y;
	this.hookReturn = false;
	this.killHook = false;
	this.isHookCreated = false;
	this.isShooting = false;
	this.beingHooked = false;
	this.respawn = false;
	this.lastUpdate = 0;
	this.delay = 0;
	
	this.hud = Phaser.Plugin.HUDManager.create(game, this, 'captainHUD');
  	this.healthHUD = this.hud.addBar(0,-20, 32, 2, 100, 'hp', this, Phaser.Plugin.HUDManager.HEALTHBAR, false);
  	this.healthHUD.bar.anchor.setTo(0.5, 0.5);

	var style = { font: "10px Arial", fill: "#ff0044", align: "center" };
	this.nameLabel = game.add.text(0, -24, this.playerID, style);
	this.nameLabel.anchor.set(0.5);
	this.sprite.addChild(this.healthHUD.bar);
	this.sprite.addChild(this.nameLabel);

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
		this.isShooting = true;
	}
	
	this.disableCollision = function(){
		this.sprite.body.checkCollision.left=false;
		this.sprite.body.checkCollision.right=false;
	}
	
	this.enableCollision = function (){
		this.sprite.body.checkCollision.left=true;
		this.sprite.body.checkCollision.right=true;
	}
	
	this.setHookPosition = function(_x,_y){
		this.hook.x= _x;
		this.hook.y = _y;
	}
	
	this.killHook = function(){
		this.hook.kill();
		this.isShooting = false;
		this.killHook =false;
	}
}


Captain.prototype.update = function(x, y, hp, hook_x, hook_y,beingHooked,hookReturn,killHook,isShoot,respawn,timestamp,playerDelay) {
	this.sprite.x = x;
	this.sprite.y = y;
	this.hp = hp;
	this.isShooting = isShoot;
	this.killHook = killHook;
	this.hookReturn = hookReturn;
	this.beingHooked = beingHooked;
	this.respawn = respawn;
	this.lastUpdate = timestamp;
	this.delay = playerDelay;
	// if there is hook position, check if hook exist alr, if not create hook
	if (isShoot) {
		// Check if hook already exist
		if (this.isHookCreated) {
			this.hook.x = hook_x;
			this.hook.y = hook_y;
		} else {
			this.isHookCreated = true;
			this.createHook(hook_x, hook_y);
		}
	}
	if ((killHook)&&(this.isHookCreated)){
		this.hook.kill();
		this.isHookCreated = false;
	}
	if (respawn){
		this.sprite.x = this.initialX;
		this.sprite.y = this.initialY;
		this.hp = 100;
		this.respawn = false;
	}
}