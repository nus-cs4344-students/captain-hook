"use strict";

function Character(xPos,yPos){
	//Public variables
	this.x;
	this.y;
	this.vx;
	this.vy;
	this.hp;
	
	//Constructor
	var that = this;
	this.x = xPos;
	this.y = yPos;
	this.vx = 0;
	this.vy = 0;
	this.hp = 100;
	
	var die = function(){
		
	}
}

// Public method: takeDmg()
// remark: if two characters are getting nearer, automatically deduct their own HP
Character.prototype.takeDmg = function(){
	
}

// Public method: respawn()
Character.prototype.respawn(){
	
}


global.Character = Character;