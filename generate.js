var fs = require('fs');
var path = require('path');

function getTargetsList()
{
	var targetList = [];
	
	var targetsDir = path.resolve(__dirname, 'targets');

	var targets = fs.readdirSync(targetsDir);
	for(var i in targets)
	{
		var target = targets[i];
		if(target[0] == '.')
			continue;
		
		var targetSourceDir = path.resolve(targetsDir, target);
		var targetMain = path.resolve(targetSourceDir, 'make.js');
		if(!fs.existsSync(targetMain))
			continue;
		
		targetList.push(target);
	}
	
	return targetList;
}
	
function generate(args)
{
	var targetList = getTargetsList();
	
	var syntax = "Synatax: node generate.js <apiSpecLocation> [-t <testFilePath>] [<targetName>=<targetOutputLocation>] ...\n"+
				"\t<apiSpecLocation> : Directory where the *.api.json files are\n"+
				"\tYou must list one or more target=outputLocation arguments. Warning, put no spaces around the =\n";
	
	if(args.length < 4)
	{
		console.log(syntax);
		console.log("Possible targetNames:\n");
		for(var i in targetList)
		{
			console.log("\t"+targetList[i]);
		}
	
		process.exit();
	}

	var targetLookup = {};
	for(var t in targetList)
	{
		targetLookup[targetList[t]] = true;
	}
	
	var specLocation = path.normalize(args[2]);
	var testLocation = null;
	var testData = null;
	
	var firstTargetIndex = 3;
	if(args[3] == "-t")
	{
		if(args.length < 5)
		{
			console.log(syntax);
			process.exit();
		}
		testLocation = path.normalize(args[4]);
		if(!fs.existsSync(testLocation))
		{
			console.log("Test plan file not found: "+testLocation);
			process.exit();
		}
		var testData = (JSON.parse(fs.readFileSync(testLocation)));
		//testData = require(testLocation);
		if(!testData)
		{
			console.log("Couldn't load test input data at "+testLocation);
			process.exit();
		}
		
		firstTargetIndex = 5;
	}
	
	if(firstTargetIndex >= args.length)
	{
		console.log(syntax);
		console.log("Possible targetNames:\n");
		for(var i in targetList)
		{
			console.log("\t"+targetList[i]);
		}
	
		process.exit();
	}
	
	var targetOutputLocationList = [];
	
	for(var a = firstTargetIndex; a<args.length; a++)
	{
		var argPair = args[a].split('=');
		if(argPair.length != 2)
		{
			console.error(syntax);
			process.exit();
		}
		var targetOutput = {};
		targetOutput.name = argPair[0];
		targetOutput.dest = path.normalize(argPair[1]);
		if(!targetLookup[targetOutput.name])
		{
			console.log("Unknown SDK target name: "+targetOutput.name);
			console.log("Possible targetNames:");
			for(var i in targetList)
			{
				console.log("\t"+targetList[i]);
			}
	
			process.exit();
		}
		if(!testData && fs.existsSync(targetOutput.dest) && !fs.lstatSync(targetOutput.dest).isDirectory())
		{
			console.log("Invalid target output path: "+targetOutput.dest);
			process.exit();
		}
		
		targetOutputLocationList.push(targetOutput);
	}
	
	var clientApi = require(path.resolve(specLocation, 'Client.api.json'));
	var serverApis = [
		require(path.resolve(specLocation, 'Admin.api.json')),
		require(path.resolve(specLocation, 'Matchmaker.api.json')),
		require(path.resolve(specLocation, 'Server.api.json'))
		];
	var allApis = serverApis.concat(clientApi);
	
	var apiLookup = {};

	if(testData)
	{
		// Add all the extra lookups needed by the test generators
		for(var a in allApis)
		{
			var api = allApis[a];
			apiLookup[api.name] = api;
			
			api.callLookup = {};
			for(var c in api.calls)
			{
				var call = api.calls[c];
				api.callLookup[call.name] = call;
			}
			
			for(var d in api.datatypes)
			{
				var datatype = api.datatypes[d];
				var propLookup = {};
				datatype.propLookup = propLookup;
				for(var p in datatype.properties)
				{
					var property = datatype.properties[p];
					propLookup[property.name] = property;
				}
			}
		}
	
		preprocessTests(testData, apiLookup);
	}
	
	console.log("Generating PlayFab APIs from specs at "+specLocation);

	var targetsDir = path.resolve(__dirname, 'targets');

	var targets = fs.readdirSync(targetsDir);
	for(var t in targetOutputLocationList)
	{
		var target = targetOutputLocationList[t];

		var sdkOutputDir = target.dest;
		
		var targetSourceDir = path.resolve(targetsDir, target.name);
		var targetMain = path.resolve(targetSourceDir, 'make.js');
		
		console.log("Making target "+target.name+" to location "+sdkOutputDir);
		var targetMaker = require(targetMain);
		
		if(testData)
		{
			if(targetMaker.makeTests)
			{
				targetMaker.makeTests(testData, apiLookup, targetSourceDir, sdkOutputDir);
			}
			else
			{
				console.log("Target "+target.name+" can't make tests");
			}
			continue;
		}
		
		if(targetMaker.makeClientAPI)
		{
			var apiOutputDir = sdkOutputDir;
			console.log("Generating to "+apiOutputDir);
			if(!targetMaker.putInRoot)
				apiOutputDir = path.resolve(sdkOutputDir, 'PlayFabClientSDK');

			console.log("Now generating to "+apiOutputDir);

			if(!fs.existsSync(apiOutputDir))
				mkdirParentsSync(apiOutputDir);
			
			targetMaker.makeClientAPI(clientApi, targetSourceDir, apiOutputDir);
		}
		
		if(targetMaker.makeServerAPI)
		{
			var apiOutputDir = path.resolve(sdkOutputDir, 'PlayFabServerSDK');
			if(!fs.existsSync(apiOutputDir))
				mkdirParentsSync(apiOutputDir);
			
			targetMaker.makeServerAPI(serverApis, targetSourceDir, apiOutputDir);
		}
		
		if(targetMaker.makeCombinedAPI)
		{
			var apiOutputDir = sdkOutputDir;
			if(!targetMaker.putInRoot)
				apiOutputDir = path.resolve(sdkOutputDir, 'PlayFabSDK');
				
			if(!fs.existsSync(apiOutputDir))
				mkdirParentsSync(apiOutputDir);
			
			targetMaker.makeCombinedAPI(allApis, targetSourceDir, apiOutputDir);
		}
		
		if(targetMaker.makeEachAPI)
		{
			for(var i in allApis)
			{
				var api = allApis[i];
				
				var apiOutputDir = path.resolve(sdkOutputDir, 'PlayFab'+api.name+'SDK');
				if(!fs.existsSync(apiOutputDir))
					mkdirParentsSync(apiOutputDir);
				
				targetMaker.makeCombinedAPI(api, targetSourceDir, apiOutputDir);
			}
		}
	}
}

function preprocessTests(testData, apiLookup)
{
	var testNames = {};
	var error = false;
	
	for(var t in testData.tests)
	{
		var test = testData.tests[t];
		if(typeof test == 'string')
			continue;
		
		var api = apiLookup[test.api];
		if(!api)
		{
			console.log("Test refers to unknown API "+test.api);
			error = true;
		}
		
		if(!api.callLookup[test.call])
		{
			console.log("Test refers to unknown API call "+test.api+"/"+test.call);
			error = true;
		}
		
		if(test.result && test.error)
		{
			console.log("Test expects both an error and a result "+test.api+"/"+test.call);
			error = true;
		}
		
		if(test.error && !api.errors[test.error])
		{
			console.log("Test "+test.api+"/"+test.call+" expects unknown error code "+test.error);
			error = true;
		}
		
		var baseName = test.name;
		if(!baseName)
			baseName = test.api+"_"+test.call;
		var name = baseName;
		
		if(testNames[name])
		{
			// Name already used
			for(var incr = 1; incr < 1000; incr++)
			{
				name = baseName+incr;
				if(!testNames[name])
				{
					break;
				}
			}
		}
		
		
		testNames[name] = test;
		test.name = name;
		
	}
	
	if(error)
		process.exit();
}
	
GLOBAL.copyTree = function(source, dest)
{
	if(!fs.existsSync(source))
	{
		console.error("Copy tree source doesn't exist: "+source);
		return;
	}
	
    if (fs.lstatSync(source).isDirectory())
	{
		if (!fs.existsSync(dest))
		{
			mkdirParentsSync(dest);
		}
		else if(!fs.lstatSync(dest).isDirectory())
		{
			console.error("Can't copy a directory onto a file: "+source+" "+dest);
			return;
		}
		
	
        var filesInDir = fs.readdirSync(source);
		for(var i in filesInDir)
		{
			var filename = filesInDir[i];
			var file = source+'/'+filename;
			if (fs.lstatSync(file).isDirectory())
			{
				copyTree(file, dest+'/'+filename);
			}
			else
			{
				copyFile(file, dest);
			}
		}
    }
	else
	{
		copyFile(source, dest);
	}
}

GLOBAL.copyFile = function(source, dest)
{
	if(!source || !dest)
	{
		console.error("Invalid copy file parameters: "+source+" "+dest);
		return;
	}
	
	if(!fs.existsSync(source))
	{
		console.error("copyFile source doesn't exist: "+source);
		return;
	}
	var sourceStat = fs.lstatSync(source);
	
	if (sourceStat.isDirectory())
	{
		console.error("copyFile source is a directory: "+source);
		return;
	}
	
	var filename = path.basename(source);
		
	if(fs.existsSync(dest))
	{
		if(fs.lstatSync(dest).isDirectory())
		{
			dest += '/'+filename;
		}
	}
	else
	{
		if(dest[dest.length-1] == '/' || dest[dest.length-1] == '\\')
		{
			mkdirParentsSync(dest);
			dest += filename;
		}
		else
		{
			var dirname = path.dirname(dest);
			mkdirParentsSync(dirname);
		}
	}
	
	if(fs.existsSync(dest))
	{
		if(fs.lstatSync(dest).mtime.getTime() >= sourceStat.mtime.getTime())
		{
			return;
		}
	}
	
	var BUF_LENGTH = 64*1024;
	var buff = new Buffer(BUF_LENGTH);
	
	var fdr = fs.openSync(source, 'r');
	var fdw = fs.openSync(dest, 'w');
	var bytesRead = 1;
	var pos = 0;
	while(bytesRead > 0)
	{
		bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
		fs.writeSync(fdw, buff, 0, bytesRead);
		pos += bytesRead;
	}
	fs.closeSync(fdr);
	fs.closeSync(fdw);
	
}

GLOBAL.mkdirParentsSync = function(dirname)
{
	if(fs.existsSync(dirname))
		return;
	
	var parentName = path.dirname(dirname);
	mkdirParentsSync(parentName);
	
	fs.mkdirSync(dirname);
}

GLOBAL.readFile = function(filename)
{
	return fs.readFileSync(filename, "utf8");
}

GLOBAL.writeFile = function(filename, data)
{
	var dirname = path.dirname(filename);
	if(!fs.existsSync(dirname))
		mkdirParentsSync(dirname);
		
	return fs.writeFileSync(filename, data);
}

GLOBAL.ejs = require("ejs");

generate(process.argv);

