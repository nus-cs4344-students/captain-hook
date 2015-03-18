"use strict";

function Hook(pid){
	//Public variables:
	this.x;
	this.y;
	this.vx;
	this.vy;
	this.hid;
	
	//Constructor
	this.hid = pid;
	
}

global.Hook = Hook;