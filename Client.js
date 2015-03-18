"use strict";

function Client(){
	//private variables
	var socket;
	var playArea;
	var hook1;
	var hook2;
	var character1;
	var character2;
	
	var appendMessage = function(location,msg){
		var prev_msgs = document.getElementById(location).innerHTML;
        document.getElementById(location).innerHTML = "[" + new Date().toString() + "] " + msg + "<br />" + prev_msgs;
	}
	
	var sentToServer = function(msg){
        var date = new Date();
        var currentTime = date.getTime();
        msg["timestamp"] = currentTime;
        socket.send(JSON.stringify(msg));
	}
	
	var initNetwork = function(){
		try {
			socket = new SockJS("http://"+CaptainHook.SERVER_NAME+":"+CaptainHook.PORT + "/CaptainHook);
			socket.onmessage = function (e) {
				var message = JSON.parse(e.data);
				switch (message.type){
					case "message":
						appendMessage("serverMsg",message.content);
						break;
					case "updatePosition":
					case "updateVelocity":
					case "updateStates":
					default:
						appendMessage("serverMsg","unhandled message type " +message.type);
				}
			}
		} catch (e) {
			console.log("Failed to connect to " + "http://" + CaptainHook.SERVER_NAME+":"+CaptainHook.PORT);
		}
	}
}