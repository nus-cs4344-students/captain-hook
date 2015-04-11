function Captain(game,xPos,yPos,sid){
	this.hook;
	
	// Initialize Captain's Sprite
	this.sprite = game.add.sprite(xPos,yPos,'dude')
	this.sprite.anchor.set(0.5);
	game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
	this.sprite.body.allowRotation = false;
	this.sprite.body.collideWorldBounds = true;
	

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
	this.xVelocity = this.sprite.body.velocity.x;
	this.yVelocity = this.sprite.body.velocity.y;
	this.hookReturn = false;
	this.killHook = false;
	this.isHookCreated = false;
	this.isShooting = false;
	this.beingHooked = false;
	this.respawn = false;
	this.lastUpdate = 0;
	
	this.hud = Phaser.Plugin.HUDManager.create(game, this, 'captainHUD');
  	this.healthHUD = this.hud.addBar(0,-20, 32, 2, 100, 'hp', this, Phaser.Plugin.HUDManager.HEALTHBAR, false);
  	this.healthHUD.bar.anchor.setTo(0.5, 0.5);
  	this.sprite.addChild(this.healthHUD.bar);
	
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


Captain.prototype.update = function(x, y, hp, hook_x, hook_y,beingHooked,hookReturn,killHook,isShoot,respawn,timestamp) {
	this.sprite.x = x;
	this.sprite.y = y;
	this.hp = hp;
	this.isShooting = isShoot;
	this.killHook = killHook;
	this.hookReturn = hookReturn;
	this.beingHooked = beingHooked;
	this.respawn = respawn;
	this.lastUpdate = timestamp;
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