// Copyright 2015 Carl Hewett

// F to enter fullscreen. Click to attract circles to your mouse, hist space to create circles, and backspace to delete all of them. Have fun :)

// TODO: Freezing only happens on Chrome? Not hard-code colors

window.onload = main;

var canvasContainer;

var canvases = [];
var canvasContexts = [];

var lay0;
var lay1;
var lay2;
var mainCanvas;
var mainCanvasContext;

var inp = {}; // Input
var d = {}; // Data
var c = {}; // Constants

var music; // For GMusic

function definitions()
{
	Math.TAU = Math.PI * 2;
	
	inp.keys = [];
	inp.space = newInputKey(32); // In javascript, objects get passed by reference
	inp.backspace = newInputKey(8);
	inp.fullscreenCode = 70; // F
	
	inp.x = 0;
	inp.y = 0;
	inp.clicking = false;
	
	d.decodedMusic = false;
	d.currentMusicIndex = -1;
	d.frequencies = [];
	d.bgCircles = [];
	d.fgCircles = [];
	d.squares = [];
	
	d.isInFullscreen = false;
	
	c.defaultCanWidth = 1000;
	c.defaultCanHeight = 600;
	c.amountOfLayers = 3;
	
	c.canWidth = c.defaultCanWidth;
	c.canHeight = c.defaultCanHeight;
	c.hCanWidth = c.canWidth / 2;
	c.hCanHeight = c.canHeight / 2;
	
	c.numberOfInputKeys = inp.keys.length;
	c.mouseMoveThrottle = 1;
	
	c.musicDirectory = "music/";
	// Use .ogg! They are more reliable across all platforms. Also, it seems less likely to freeze, which is good.
	c.music = ["chandelier.ogg"];
	c.numberOfBgCircles = 40;
	c.numberOfFgCircles = 15;
	c.bgCircleRadius = 20;
	c.bgCircleSpeed = 5;
	c.fgCircleRadius = 50;
	c.fgCircleSpeed = 7;
	
	c.numberOfSquares = 15;
	c.squareSize = 200;
	c.squareSpeed = 3;
	c.squareRotationSpeed = 0.02;
	
	c.mouseCircleInteraction = 4000;
	
	c.circleRadians = 6.28318531;
	c.base = 255; // Used for various things
	
	c.usedFrequencies = 83; // Guessed this using fftSize of 1024.
}

function main()
{
	definitions(); // "Global" variables defined here
	
	var currentCanvas;
	var currentCanvasContext;
	
	(function() // requestAnimationFrame polyfill by Erik Möller. Fixed by Paul Irish and Tino Zijdel, https://gist.github.com/paulirish/1579671, MIT license
	{
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		
		for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
				window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
					|| window[vendors[x]+'CancelRequestAnimationFrame'];
		}

		if (!window.requestAnimationFrame)
			window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};

		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
	}());
	
	canvasContainer = document.createElement("div");
	canvasContainer.style.width = (c.defaultCanWidth) + "px";
	canvasContainer.style.height = (c.defaultCanHeight) + "px";
	canvasContainer.style.position = "absolute";
	canvasContainer.style.left = 0;
	canvasContainer.style.top = 0;
	canvasContainer.style.border = "solid black";
	
	for(var i=c.amountOfLayers-1; i>=0; i--)
	{
		currentCanvas = document.createElement("canvas");

		currentCanvas.style.position = "absolute";
		currentCanvas.style.left = 0;
		currentCanvas.style.top = 0;
		currentCanvas.style.zIndex = i;
		
		currentCanvas.width = c.defaultCanWidth;
		currentCanvas.height = c.defaultCanHeight;
		
		canvases.push(currentCanvas);
		
		currentCanvasContext = currentCanvas.getContext("2d");
		
		canvasContexts.push(currentCanvasContext);
		
		canvasContainer.appendChild(currentCanvas);
	}
	
	mainCanvas = canvases[0];
	mainCanvasContext = canvasContexts[0];
	
	lay0 = canvasContexts[0];
	lay1 = canvasContexts[1];
	lay2 = canvasContexts[2];
	
	document.body.appendChild(canvasContainer);
	
	addEventListeners();
	addGraphicMembers();
	
	d.bgCircles = createCircles(c.numberOfBgCircles, c.bgCircleRadius, c.bgCircleSpeed);
	d.fgCircles = createCircles(c.numberOfFgCircles, c.fgCircleRadius, c.fgCircleSpeed);
	d.squares = createSquares(c.numberOfSquares, c.squareSize, c.squareSpeed, c.squareRotationSpeed);
	
	musicEnded(); // Start first song
	
	window.requestAnimationFrame(update);
}

function musicLoaded()
{
	console.log("Downloaded " + c.music[d.currentMusicIndex]);
}

function musicDecoded() // Called when the music is decoded
{
	music.startAudio();
	d.decodedMusic = true;
}

function musicProcessed(array)
{
	d.frequencies = array;
}

function musicEnded()
{
	if(d.currentMusicIndex==c.music.length-1) // Last song
	{
		d.currentMusicIndex = 0; // Restart
	} else
	{
		d.currentMusicIndex++;
	}
	
	var musicAddress = c.musicDirectory + c.music[d.currentMusicIndex];
	d.decodedMusic = false;
	
	clearLayers();
	drawBasicBackground(lay2);
	lay0.fillStyle = "white";
	lay0.drawCenteredString("Loading " + musicAddress, c.hCanWidth, c.hCanHeight);
	
	music = new GMusic(musicAddress, {fftSize: 1024, loaded: musicLoaded, decoded: musicDecoded, processed: musicProcessed, ended: musicEnded});
}

function addEventListeners() // Only called once
{
	mainCanvas.addEventListener("mousemove", function(event){mouseMoveEventHandler(event);}, false);
	mainCanvas.addEventListener("mouseup", function(event){mouseUpEventHandler(event);}, false);
	mainCanvas.addEventListener("mousedown", function(event){mouseDownEventHandler(event);}, false);
	
	// On document
	document.addEventListener("keydown", function(event){keyDownEventHandler(event);}, false);
}

function mouseMoveEventHandler(event)
{
	var e = event || window.event;

	inp.x = e.layerX;
	inp.y = e.layerY;
}

function mouseUpEventHandler(event)
{
	inp.clicking = false;
}

function mouseDownEventHandler(event)
{
	inp.clicking = true;
}

function keyDownEventHandler(event)
{
	var e = event || window.event;
	var keyCode = e.keyCode || e.key;
	
	if(keyCode==inp.fullscreenCode)
	{
		if(d.isInFullscreen)
		{
			exitFullscreen();
			d.isInFullscreen = false;
		} else
		{
			launchFullscreen();
			d.isInFullscreen = true;
		}
	} else
	{
		for(var i=0; i<c.numberOfInputKeys; i++)
		{
			if(inp.keys[i].keyCode==keyCode)
			{
				inp.keys[i].s = true;
			}
		}
	}
	
	e.preventDefault();
	return false;
}

function resetKeys()
{
	for(var i=0; i<c.numberOfInputKeys; i++)
	{
		inp.keys[i].s = false;
	}
}

function newInputKey(keyCode)
{
	var tempObj = {};
	
	tempObj.keyCode = keyCode;
	tempObj.s = false; // State
	
	inp.keys.push(tempObj);
	
	return tempObj;
}

function addGraphicMembers()
{
	for(var i=0, length=canvasContexts.length; i<length; i++)
	{
		canvasContexts[i].clearLayer = function()
		{
			this.clearRect(0, 0, c.canWidth, c.canHeight);
		};
		
		canvasContexts[i].fillLayer = function()
		{
			this.fillRect(0, 0, c.canWidth, c.canHeight);
		};
		
		canvasContexts[i].drawCircle = function(x, y, radius, filled)
		{
			this.beginPath();
			this.arc(x, y, radius, 0, Math.TAU, true);
			
			if(filled)
			{
				this.fill();
			} else
			{
				this.stroke();
			}
		};
		
		canvasContexts[i].drawCenteredString = function(string, x, y)
		{
			var halfStringLength = this.measureText(string).width / 2;
			
			this.fillText(string, x - halfStringLength, y);
		};
	}
}

function clearLayers()
{
	for(var i=0, length=canvasContexts.length; i<length; i++)
	{
		canvasContexts[i].clearLayer();
	}
}

function drawBasicBackground(layer)
{
	layer.clearLayer();
	layer.fillStyle = "black";
	layer.fillLayer();
}

// Helper functions
function randomInt(min,max) // Inclusive
{
	return Math.floor(Math.random()*(max-min+1)+min); // http://stackoverflow.com/questions/4959975/generate-random-value-between-two-numbers-in-javascript/7228322#7228322
}

function randomFloat(min, max) // Between min and max (inclusive)
{
	return parseFloat((Math.random() * (max - min) + min).toFixed(4)); // http://stackoverflow.com/questions/17726753/get-a-random-number-between-0-0200-and-0-120-float-numbers
}

function randomBool()
{
	var number = randomInt(0, 1);
	
	if(number==0)
	{
		return false;
	}
	
	return true;
}

function isFunction(possibleFunction) // http://stackoverflow.com/questions/85815/how-to-tell-if-a-javascript-function-is-defined
{
  return (typeof(possibleFunction) == "function");
}

function distanceSquared(point1, point2)
{
	return (point2.x - point1.x) * (point2.x - point1.x) + (point2.y - point1.y) * (point2.y - point1.y);
}

function getRandomCoords()
{
	var point = {};
	
	point.x = randomInt(0, c.canWidth);
	point.y = randomInt(0, c.canHeight);
	
	return point;
}

function getRandomAngle() // Radians
{
	return randomFloat(0, c.circleRadians);
}

function addToAngle(angle, number)
{
	angle += number;
	
	if(c.circleRadians<angle)
	{
		return angle - c.circleRadians;
	}
	
	return angle;
}

function launchElementFullscreen(element) { // http://davidwalsh.name/fullscreen
  if(element.requestFullscreen) {
    element.requestFullscreen();
  } else if(element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if(element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if(element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

function getAverageFrequency(array)
{
	var length = c.usedFrequencies;
	var total = 0;
	
	if(array[0]!=null)
	{
		for(var i=0; i<length; i++)
		{
			total += array[i];
		}
	
		return total / length;
	}
	
	return 0;
}

function createCircles(numberOfCircles, maxRadius, maxSpeed, x, y)
{
	var circles = [];
	var circle;
	var minRadius = 8;
	var minSpeed = 1;
	
	for(var i=0; i<numberOfCircles; i++)
	{
		circle = {};
		
		if(x==null && y==null)
		{
			circle = getRandomCoords();
		} else
		{
			circle.x = x;
			circle.y = y;
		}
		
		circle.direction = getRandomAngle(); // Radians
		circle.radius = randomInt(minRadius, maxRadius);
		circle.speed = randomFloat(minSpeed, maxSpeed);
		
		circle.isInMouse = false;
		circles.push(circle);
	}
	
	return circles;
}

function createSquares(numberOfSquares, maxSquareSize, maxMoveSpeed, maxRotationSpeed)
{
	var squares = [];
	var minSquareSize = 50;
	var minSpeed = 0.5;
	var minRotationSpeed = 0.001;
	var square;
	
	for(var i=0; i<numberOfSquares; i++)
	{
		square = getRandomCoords();
		square.direction = getRandomAngle();
		square.speed = randomInt(minSpeed, maxMoveSpeed);
		
		square.size = randomInt(minSquareSize, maxSquareSize);
		square.rotationSpeed = randomFloat(minRotationSpeed, maxRotationSpeed);
		
		if(randomBool())
		{
			square.rotationSpeed = -square.rotationSpeed;
		}
		
		square.rotation = getRandomAngle();
		
		squares.push(square);
	}
	
	return squares;
}

function update()
{
	window.requestAnimationFrame(update);
	
	if(d.decodedMusic)
	{
		var averageAmplitude = getAverageFrequency(d.frequencies) / c.base;
		var circleColor = "rgba(255, 255, 255, 0.5)";
		/*var r = Math.round(c.base - averageAmplitude); // Colors CAN'T be floating point!
		var g = 0;
		var b = Math.round(c.base - averageAmplitude);
		var circleColor = "rgba(" + r + ", " + g + ", " + b + ", 0.8)";*/
		
		doControls();
		
		lay0.clearLayer();
		
		doCircles(lay0, circleColor, true, d.bgCircles, averageAmplitude);
		drawLines(lay0);
		doCircles(lay0, circleColor, true, d.fgCircles, averageAmplitude);
		
		lay1.clearLayer();
		doSquares(lay1, d.squares, averageAmplitude);
	}
	
	resetKeys();
}

function doControls()
{
	if(inp.space.s)
	{
		d.bgCircles = d.bgCircles.concat(createCircles(5, c.bgCircleRadius, c.bgCircleSpeed, inp.x, inp.y));
		d.fgCircles = d.fgCircles.concat(createCircles(5, c.fgCircleRadius, c.fgCircleSpeed, inp.x, inp.y));
	}
	
	if(inp.backspace.s)
	{
		d.bgCircles = [];
		d.fgCircles = [];
	}
}

function drawLines(layer) // COLOR DEFINED HERE
{
	var separation = 1;
	var lines = c.usedFrequencies;
	var lineWidth = Math.round(c.canWidth / lines) - separation;
	var hLineWidth = lineWidth / 2;
	var x = 0;
	var y = c.hCanHeight + 70; // Math.round for a sharper image?
	
	var circleYOffset = 40;
	var maxColorFrequency = 245;
	
	var frequencyValue;
	var colorValue;
	var lineX;
	var r;
	var g;
	var b;
	
	var newCircleRadius;
	
	for(var i=0; i<lines; i++)
	{
		frequencyValue = d.frequencies[i];
		lineX = (i * lineWidth) + (i * separation) + x + separation;
		
		if(frequencyValue>maxColorFrequency)
		{
			frequencyValue = maxColorFrequency;
		}
		
		colorValue = c.base - frequencyValue;
		
		r = 0;
		g = colorValue;
		b = colorValue;
		layer.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
		layer.fillRect(lineX, y-frequencyValue, lineWidth, frequencyValue);

		newCircleRadius = frequencyValue/c.base * hLineWidth;
		layer.drawCircle(lineX + hLineWidth, y + circleYOffset, newCircleRadius, true);
	}
}

/*function drawLines(layer)
{
	var separation = 1;
	var lines = c.usedFrequencies;
	var lineWidth = Math.round(c.canWidth / lines) - separation;
	var hLineWidth = lineWidth / 2;
	var x = 0;
	var y = c.hCanHeight;
	
	var circleYOffset = 180;
	
	var frequencyValue;
	var lineX;
	var lineY;
	var r;
	var g;
	var b;
	
	var circleRadius;
	
	for(var i=0; i<lines; i++)
	{
		frequencyValue = d.frequencies[i];
		lineX = (i * lineWidth) + (i * separation) + x + separation;
		lineY = y - (frequencyValue/2);
		
		r = c.base - frequencyValue;
		g = 0;
		b = c.base - frequencyValue;
		layer.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
		layer.fillRect(lineX, 400-frequencyValue, lineWidth, frequencyValue);//(lineX, lineY, lineWidth, frequencyValue);

		circleRadius = frequencyValue/c.base * 9;
		layer.drawCircle(lineX + hLineWidth, y - circleYOffset, circleRadius, true);
		layer.drawCircle(lineX + hLineWidth, y + circleYOffset, circleRadius, true);
	}
}*/

function doCircles(layer, color, filled, array, amplitude)
{
	var circle;
	
	if(filled)
	{
		layer.fillStyle = color;
	} else
	{
		layer.strokeStyle = color;
	}
	
	for(var i=0, length=array.length; i<length; i++)
	{
		circle = array[i];
		moveCircle(circle, amplitude);
		
		layer.drawCircle(circle.x, circle.y, circle.radius * amplitude, filled);
	}
}

function moveCircle(circle, amplitude) // http://gamedev.stackexchange.com/questions/37623/how-can-i-move-a-sprite-in-the-direction-it-is-facing
{
	var speed = circle.speed * amplitude * amplitude;
	
	if(inp.clicking)
	{
		if(distanceSquared(circle, inp)<c.mouseCircleInteraction)
		{
			// http://wikicode.wikidot.com/get-angle-of-line-between-two-points#sthash.A3BZUUDS.dpuf
			var xDiff = inp.x - circle.x;
			var yDiff = inp.y - circle.y;
			var direction = Math.atan2(yDiff, xDiff);
			direction %= 2 * Math.PI;
			circle.direction = direction
		}
	}
	
	var directionX = Math.cos(circle.direction);
	var directionY = Math.sin(circle.direction);
	var velocityX = directionX * speed;
	var velocityY = directionY * speed;
	
	circle.x += velocityX;
	circle.y += velocityY;
	
	goThroughSides(circle, c.fgCircleRadius);
}

function goThroughSides(object, offScreenSize) // offScreenSize is the size of the object (a square)
{
	if(object.x+offScreenSize<0)
	{
		object.x = c.canWidth + offScreenSize;
	} else if(object.x-offScreenSize>c.canWidth)
	{
		object.x = -offScreenSize;
	}
	
	if(object.y+offScreenSize<0)
	{
		object.y = c.canHeight + offScreenSize;
	} else if(object.y-offScreenSize>c.canHeight)
	{
		object.y = -offScreenSize;
	}
}

function doSquares(layer, array, amplitude)
{
	var square;
	var size2;
	
	layer.fillStyle = "rgba(255, 255, 255, 0.1)";
	layer.save();
	
	for(var i=0, length=array.length; i<length; i++)
	{
		square = array[i];
		size2 = square.size + square.size;
		
		moveSquare(square, amplitude);
		
		layer.translate(square.x, square.y);
		layer.rotate(square.rotation);
		layer.fillRect(-square.size, -square.size, size2, size2);
		
		layer.restore();
		layer.save();
	}
}

function moveSquare(square, amplitude)
{
	var speed = square.speed * amplitude * amplitude;
	
	var directionX = Math.cos(square.direction);
	var directionY = Math.sin(square.direction);
	var velocityX = directionX * speed;
	var velocityY = directionY * speed;
	
	square.x += velocityX;
	square.y += velocityY;
	
	goThroughSides(square, c.squareSize + 50); // Guessed 50, this is because the squares rotate
	rotateSquare(square, amplitude);
}

function rotateSquare(square, amplitude)
{
	square.rotation = addToAngle(square.rotation, square.rotationSpeed * amplitude);
}

function changeCanvasDimensions(width, height) // Also changes the canvasContainer
{
	var canvas;
	
	for(var i=0, length=canvases.length; i<length; i++)
	{
		canvas = canvases[i];
		
		canvas.width = width;
		canvas.height = height;
	}
	
	c.canWidth = width;
	c.canHeight = height;
	c.hCanWidth = width / 2;
	c.hCanHeight = height / 2;
	canvasContainer.width = width;
	canvasContainer.height = height;
}

function launchFullscreen()
{
	d.isInFullscreen = true;
	
	launchElementFullscreen(canvasContainer);
	changeCanvasDimensions(screen.width, screen.height);
	drawBasicBackground(lay2);
}

function exitFullscreen() // Based on http://davidwalsh.name/fullscreen
{
	d.isInFullscreen = false;
	
	if(document.exitFullscreen)
	{
		document.exitFullscreen();
	} else if(document.mozCancelFullScreen)
	{
		document.mozCancelFullScreen();
	} else if(document.webkitExitFullscreen)
	{
		document.webkitExitFullscreen();
	}
	
	changeCanvasDimensions(c.defaultCanWidth, c.defaultCanHeight);
	drawBasicBackground(lay2);
}