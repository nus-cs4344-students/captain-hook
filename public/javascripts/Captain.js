
function Captain(game, xPos, yPos, sid, tid, pname, _rName){
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
	this.sprite.animations.add('attack', [24, 25, 26], 10, true);

	this.tailBits = [];
	this.numberOfTailBits = 0;

	game.world.bringToTop(this.sprite);

	//Constructor
	this.game = game;
	this.initialX = xPos;
	this.initialY = yPos;
	this.hp = 100;
	this.playerID = sid;
	this.playerName = pname;
	this.teamID = tid;		// determined by server
	this.xVelocity = this.sprite.body.velocity.x;
	this.yVelocity = this.sprite.body.velocity.y;
	this.hookReturn = false;
	this.killHook = false;
	this.isHookCreated = false;
	this.beingHooked = false;
	this.respawn = false;
	this.lastUpdate = 0;
	this.delay = 0;
	this.speedOfHook = 500;
	this.roomName = _rName;
	
	this.hud = Phaser.Plugin.HUDManager.create(game, this, 'captainHUD');
  	this.healthHUD = this.hud.addBar(0, -20, 32, 2, 100, 'hp', this, Phaser.Plugin.HUDManager.HEALTHBAR, false);
  	this.healthHUD.bar.anchor.setTo(0.5, 0.5);

	var style = { font: "10px Arial", fill: "#ff0044", align: "center" };
  	this.nameLabel = game.add.text(0, -24, this.playerName, style);
    this.nameLabel.anchor.set(0.5);
  	this.sprite.addChild(this.healthHUD.bar);
  	this.sprite.addChild(this.nameLabel);
	
	this.isDead = function(){
		if(this.hp<=0){
			return true;
		}
		return false;
	};
	
	this.createHook = function(_x,_y){
		this.hook = game.add.sprite(_x+10,_y+10,'star');
		this.hook.anchor.set(0.5);
		game.physics.enable(this.hook,Phaser.Physics.ARCADE);
		this.hook.body.collideWorldBounds = false;
		this.isShooting = true;
	};

	this.addTailBit = function() {
		this.tailBits[this.numberOfTailBits] = game.add.sprite(this.sprite.x+10,this.sprite.y+10,'tailBit');
		game.physics.enable(this.tailBits[this.numberOfTailBits],Phaser.Physics.ARCADE);
		if (this.numberOfTailBits == 0) {
			this.game.physics.arcade.moveToObject(this.tailBits[this.numberOfTailBits], this.hook, this.speedOfHook);
		} else {
			this.game.physics.arcade.moveToObject(this.tailBits[this.numberOfTailBits], this.tailBits[this.numberOfTailBits-1], this.speedOfHook);
		}
		this.numberOfTailBits++;
	};
	
	this.disableCollision = function(){
		this.sprite.body.checkCollision.left=false;
		this.sprite.body.checkCollision.right=false;
	};
	
	this.enableCollision = function (){
		this.sprite.body.checkCollision.left=true;
		this.sprite.body.checkCollision.right=true;
	};
	
	this.setHookPosition = function(_x,_y){
		this.hook.x= _x;
		this.hook.y = _y;
	};
	
	this.killHook = function(){
		this.hook.kill();
		this.isShooting = false;
		this.killHook =false;
	}
}


Captain.prototype.update = function(x, y, hp, hook_x, hook_y, beingHooked, hookReturn, killHook, isShoot, respawn, timestamp, playerDelay) {
	this.game.world.bringToTop(this.sprite);
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

		for (var i = 0; i < this.tailBits.length; i++) {
			this.tailBits[i].kill();
		}
		this.numberOfTailBits = 0;
	}

	if (respawn){
		this.sprite.x = this.initialX;
		this.sprite.y = this.initialY;
		this.hp = 100;
		this.respawn = false;
	}

	// Creates tail of hook
	if (this.isHookCreated) {
		if (this.numberOfTailBits == 0) {
			if (this.game.physics.arcade.distanceBetween(this.hook, this.sprite) > 16) {
				this.addTailBit();
			}
		} else {
			if (this.game.physics.arcade.distanceBetween(this.tailBits[this.numberOfTailBits-1], this.sprite) > 16) {
				this.addTailBit();
			}
		}

		if (!hookReturn) {
			for (var i = 0; i < this.numberOfTailBits; i++) {
				this.game.physics.arcade.moveToObject(this.tailBits[i], this.hook, this.speedOfHook);
			}
		} else {
			for (var i = 0; i < this.numberOfTailBits; i++) {
				this.game.physics.arcade.moveToObject(this.tailBits[i], this.sprite, this.speedOfHook);

				if (this.game.physics.arcade.distanceBetween(this.tailBits[i], this.sprite) < 9) {
					this.tailBits[i].kill();
				}
			}
		}
	}
};
