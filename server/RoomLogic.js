"use strict";

function run(room, player, msg)
{
	// Implement your game room (server side) logic here
	console.log("Processing " + player.name + "@" + room.name + ": " + msg);
}

function update(room)
{
	// Update room
	if (room.IsPlaying())
	{
		console.log("Room " + room.name + " is playing");
	}
}

module.exports.update = update;
module.exports.run = run;