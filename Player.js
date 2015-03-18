function Player(sid,pid,xPos,yPos,teamID){
	//Public variables
	this.sid;
	this.pid;
	this.character;
	this.teamID;
		
	//Constructor
	this.sid = sid;
	this.pid = pid;
	this.teamID = teamID;
	this.character = new Character(xPos,yPos);
}

global.Player = Player;