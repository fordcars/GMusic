// Copyright 2015 Carl Hewett

// Based on http://srchea.com/experimenting-with-web-audio-api-three-js-webgl

// Usage: new GMusic(address);
if(GMusic==null)
{
	var GMusic = (function(address, parameters) // Scopes are local to functions. GMusic is global.
	{
		var interface = {};
		var context;
		var audioRequest;
		var audioSource; // For starting/stopping
		var audioDecoded;
		
		// Make sure sourceJs and analyser are not local, but are in the main object!
		// Other wise, audio data might freeze.
		var sourceJs
		var analyser;
		
		function setupAudioContext()
		{
			var context;
			
			if(typeof(AudioContext) == "function")
			{
				context = new AudioContext();
			}
			else
			{
				try
				{
					context = new webkitAudioContext(); // Webkit
				}
				catch(e)
				{
					console.error("Web Audio API is not supported in this browser");
					return false;
				}
			}
			
			return context;
		}
		
		function getAudioRequest()
		{
			var request;
			if(address==null)
			{
				console.error("Error: no address specified. Usage: new GMusic(address, parameters)");
				return false;
			}
			
			request = new XMLHttpRequest();
			request.open("GET", address, true);
			request.responseType = "arraybuffer";
			request.onload = function()
			{
				audioLoaded(request);
			}
			request.send(null); // GET!
			
			return request;
		}
		
		function audioLoaded(request)
		{
			var audioData = request.response;
			
			if(parameters!=null && parameters.loaded!=null)
			{
				parameters.loaded();
			}
			
			setupAudio(audioData);
		}
		
		function setupAudio(audioData)
		{
			context.decodeAudioData(audioData, function(buffer)
			{
				if(!buffer)
				{
					// Error decoding file data
					return false;
				}
				
				var scriptSize = 1024;
				var fftSize = 1024; // Not too bad imo. This defines how many frequencies actually have a value.
				
				if(parameters!=null)
				{
					if(parameters.scriptSize!=null)
					{
						scriptSize = parameters.scriptSize;
					}
					
					if(parameters.fftSize!=null)
					{
						fftSize = parameters.fftSize;
					}
				}
				
				sourceJs = context.createScriptProcessor(scriptSize); // Uses the analyser's data
				sourceJs.buffer = buffer;
				sourceJs.connect(context.destination);
				
				analyser = context.createAnalyser();
				analyser.smoothingTimeConstant = 0.6;
				analyser.fftSize = fftSize; // Useful!

				audioSource = context.createBufferSource(); // audioSource
				audioSource.buffer = buffer;

				audioSource.connect(analyser);
				analyser.connect(sourceJs);
				audioSource.connect(context.destination);
				
				audioSource.loop = false;
				
				audioSource.onended = function(e)
				{
					audioEnded();
				}
				
				sourceJs.onaudioprocess = function(e)
				{
					audioProcessed();
				}
			});
		}
		
		function audioEnded()
		{
			interface.stopAudio(); // Nice!
			
			if(parameters!=null && parameters.ended!=null)
			{
				parameters.ended();
			}
		}
		
		function audioProcessed()
		{
			if(!audioDecoded)
			{
				audioDecoded = true;
				if(parameters!=null && parameters.decoded!=null)
				{
					parameters.decoded();
				}
			}
			
			var array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			
			if(parameters!=null && parameters.processed!=null)
			{
				parameters.processed(array);
			}
		}
		
		interface.startAudio = function()
		{
			audioSource.start(0);
		}
		
		interface.stopAudio = function()
		{
			audioSource.stop();
		}
		
		context = setupAudioContext();
		audioRequest = getAudioRequest();
		
		return interface;
	});
} else
{
	console.error("Error: GMusic global not available. Please change this variable.");
}
		