var canvas = document.getElementById('game');
canvas.width = 800;
canvas.height = 400;
var context = canvas.getContext('2d');
context.fillStyle = '#000000';
context.fillRect(0, 0, 800, 400);

context.fillStyle = "#ffffff";
context.beginPath();
context.arc(40, 40, 20, 0, Math.PI*2, true);
context.closePath();
context.fill();
