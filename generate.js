var fs = require("fs");
var path = require("path");

function stringStartsWith(value, prefix) {
    return value.slice(0, prefix.length) === prefix;
}

function getTargetsList() {
    var targetList = [];
    
    var targetsDir = path.resolve(__dirname, "targets");
    
    var targets = fs.readdirSync(targetsDir);
    for (var i in targets) {
        var target = targets[i];
        if (target[0] === ".")
            continue;
        
        var targetSourceDir = path.resolve(targetsDir, target);
        var targetMain = path.resolve(targetSourceDir, "make.js"); // search for make.js in each subdirectory within "targets"
        if (fs.existsSync(targetMain))
            targetList.push(target);
    }
    
    return targetList;
}

function generate(args) {
    var targetList = getTargetsList();
    
    var syntax = "Synatax: node generate.js <apiSpecLocation> <targetName>=<targetOutputLocation> [-flags <flag>[ <flag> ...]]\n" +
                "\tExample: node generate.js C:/depot/API_Specs csharp-unity=../sdks/UnitySDK -flags xbox playstation\n" +
                "\t\tThis should build the UnitySDK, from the given Api-specs folder, with a bunch of optional console APIs included\n" +
                "\t<apiSpecLocation> : Directory where the *.api.json files are\n" +
                "\tYou must list one or more target=outputLocation arguments. Warning, there can be no spaces in the target-specification";
    
    if (args.length < 3) { // If missing mandatory arguments, display syntax and exit
        console.log(syntax);
        console.log("Possible targetNames:");
        console.log("\t" + targetList.join(", "));
        process.exit();
    }
    
    var buildFlags = [];
    var targetOutputLocationList = []; // A list of objects that describe an sdk target
    var collectingFlags = false;
    for (var i = 3; i < args.length; i++) {
        // Process mode changes
        if (collectingFlags && args[i].indexOf("-") === 0)
            collectingFlags = false;
        
        // Process the effect of individual arg commands
        if (stringStartsWith(args[i], "-t")) {
            console.log("The -t option in SdkGenerator has been removed.  The new Jenkins testing is more thorough and replaces this old functionality.");
            console.log(syntax);
            process.exit();
        } else if (args[i] === "-flags") {
            collectingFlags = true;
        } else if (args[i] === "-beta") { // LEGACY OPTION - TODO: Remove this one when Jenkins is fully converted
            buildFlags.push("beta");
        } else if (collectingFlags) {
            buildFlags.push(args[i]);
        } else if (args[i].indexOf("=") !== -1) { // any parameter with an "=" is assumed to be a target specification
            var argPair = args[i].split("=", 2);
            var targetOutput = {};
            targetOutput.name = argPair[0];
            targetOutput.dest = path.normalize(argPair[1]);
            if (fs.existsSync(targetOutput.dest) && !fs.lstatSync(targetOutput.dest).isDirectory()) {
                console.log("Invalid target output path: " + targetOutput.dest);
                process.exit();
            }
            targetOutputLocationList.push(targetOutput);
        } else {
            console.log("Cannot parse parameter: " + args[i]);
            console.log(syntax);
            process.exit();
        }
    }
    
    buildFlags = LowercaseFlagsList(buildFlags);
    var specLocation = path.normalize(args[2]);
    var clientApi = GetApiDefinition(specLocation, "Client.api.json", buildFlags);
    var serverApis = [
        GetApiDefinition(specLocation, "Admin.api.json", buildFlags),
        GetApiDefinition(specLocation, "Matchmaker.api.json", buildFlags),
        GetApiDefinition(specLocation, "Server.api.json", buildFlags)
    ];

    var allApis = serverApis.concat(clientApi);
    
    console.log("Generating PlayFab APIs from specs at " + specLocation);
    
    var targetsDir = path.resolve(__dirname, "targets");
    
    for (var t in targetOutputLocationList) {
        var target = targetOutputLocationList[t];
        
        var sdkOutputDir = target.dest;
        
        var targetSourceDir = path.resolve(targetsDir, target.name);
        var targetMain = path.resolve(targetSourceDir, "make.js");
        
        console.log("Making target " + target.name + " to location " + sdkOutputDir);
        var targetMaker = require(targetMain);
        
        // It would probably be better to pass these into the functions, but I don't want to change all the make___Api parameters for all projects today.
        //   For now, just change the global variables in each with the data loaded from SdkManualNotes.json
        targetMaker.apiNotes = require(path.resolve(specLocation, "SdkManualNotes.json"));
        targetMaker.sdkVersion = targetMaker.apiNotes.sdkVersion[target.name];
        if (targetMaker.sdkVersion == null) {
            throw "SdkManualNotes does not contain sdkVersion for " + target.name; // The point of this error is to force you to add a line to sdkManualNotes.json, to describe the version and date when this sdk/collection is built
        }

        var apiOutputDir = "";
        
        if (targetMaker.makeClientAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabClientSDK");
            console.log(" + Generating Client to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                mkdirParentsSync(apiOutputDir);
            targetMaker.makeClientAPI(clientApi, targetSourceDir, apiOutputDir);
        }
        
        if (targetMaker.makeServerAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabServerSDK");
            console.log(" + Generating Server to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                mkdirParentsSync(apiOutputDir);
            targetMaker.makeServerAPI(serverApis, targetSourceDir, apiOutputDir);
        }
        
        if (targetMaker.makeCombinedAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabSDK");
            console.log(" + Generating Combined to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                mkdirParentsSync(apiOutputDir);
            targetMaker.makeCombinedAPI(allApis, targetSourceDir, apiOutputDir);
        }
    }
    
    console.log("\n\nDONE!\n");
}

var GetApiDefinition = function (specLocation, apiFileName, buildFlags) {
    var api = require(path.resolve(specLocation, apiFileName));
    
    // Filter calls out of the API before returning it
    var filteredCalls = [];
    for (var i in api.calls)
        if (IsVisibleWithFlags(buildFlags, api.calls[i]))
            filteredCalls.push(api.calls[i]);
    api.calls = filteredCalls;
    
    // Filter datatypes out of the API before returning it
    var filteredTypes = {};
    for (var i in api.datatypes)
        if (IsVisibleWithFlags(buildFlags, api.datatypes[i]))
            filteredTypes[api.datatypes[i].name] = api.datatypes[i];
    api.datatypes = filteredTypes;
    return api;
}

var IsVisibleWithFlags = function (buildFlags, apiObj) {
    // It's pretty easy to exclude (Api calls and datatypes)
    var exclusiveFlags = [];
    if (apiObj.hasOwnProperty("ExclusiveFlags"))
        exclusiveFlags = LowercaseFlagsList(apiObj.ExclusiveFlags);
    for (var i in buildFlags)
        if (exclusiveFlags.indexOf(buildFlags[i]) !== -1)
            return false;
    
    // All Inclusive flags must match if present (Api calls only)
    var allInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AllInclusiveFlags"))
        allInclusiveFlags = LowercaseFlagsList(apiObj.AllInclusiveFlags);
    if (allInclusiveFlags.length !== 0) // If there's no flags, it is always included
        for (var i in allInclusiveFlags)
            if (buildFlags.indexOf(allInclusiveFlags[i]) === -1)
                return false; // If a required flag is missing, fail out
    
    // Any Inclusive flags must match at least one if present (Api calls and datatypes)
    var anyInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AnyInclusiveFlags"))
        anyInclusiveFlags = LowercaseFlagsList(apiObj.AnyInclusiveFlags);
    if (anyInclusiveFlags.length === 0)
        return true; // If there's no flags, it is always included
    for (var i in anyInclusiveFlags)
        if (buildFlags.indexOf(anyInclusiveFlags[i]) !== -1)
            return true; // Otherwise at least one flag must be present
    return false;
}

var LowercaseFlagsList = function (flags) {
    var output = [];
    for (var i in flags)
        output.push(flags[i].toLowerCase());
    return output;
}

GLOBAL.copyTree = function (source, dest) {
    if (!fs.existsSync(source)) {
        console.error("Copy tree source doesn't exist: " + source);
        return;
    }
    
    if (fs.lstatSync(source).isDirectory()) {
        if (!fs.existsSync(dest)) {
            mkdirParentsSync(dest);
        }
        else if (!fs.lstatSync(dest).isDirectory()) {
            console.error("Can't copy a directory onto a file: " + source + " " + dest);
            return;
        }
        
        
        var filesInDir = fs.readdirSync(source);
        for (var i in filesInDir) {
            var filename = filesInDir[i];
            var file = source + "/" + filename;
            if (fs.lstatSync(file).isDirectory()) {
                copyTree(file, dest + "/" + filename);
            }
            else {
                copyFile(file, dest);
            }
        }
    }
    else {
        copyFile(source, dest);
    }
}

GLOBAL.copyFile = function (source, dest) {
    if (!source || !dest) {
        console.error("Invalid copy file parameters: " + source + " " + dest);
        return;
    }
    
    if (!fs.existsSync(source)) {
        console.error("copyFile source doesn't exist: " + source);
        return;
    }
    var sourceStat = fs.lstatSync(source);
    
    if (sourceStat.isDirectory()) {
        console.error("copyFile source is a directory: " + source);
        return;
    }
    
    var filename = path.basename(source);
    
    if (fs.existsSync(dest)) {
        if (fs.lstatSync(dest).isDirectory()) {
            dest += "/" + filename;
        }
    }
    else {
        if (dest[dest.length - 1] === "/" || dest[dest.length - 1] === "\\") {
            mkdirParentsSync(dest);
            dest += filename;
        }
        else {
            var dirname = path.dirname(dest);
            mkdirParentsSync(dirname);
        }
    }
    
    if (fs.existsSync(dest)) {
        // TODO: Make this an optional flag
        //if(fs.lstatSync(dest).mtime.getTime() >= sourceStat.mtime.getTime())
        //{
        //    return;
        //}
    }
    
    var bufLength = 64 * 1024;
    var buff = new Buffer(bufLength);
    
    var fdr = fs.openSync(source, "r");
    var fdw = fs.openSync(dest, "w");
    var bytesRead = 1;
    var pos = 0;
    while (bytesRead > 0) {
        bytesRead = fs.readSync(fdr, buff, 0, bufLength, pos);
        fs.writeSync(fdw, buff, 0, bytesRead);
        pos += bytesRead;
    }
    fs.closeSync(fdr);
    fs.closeSync(fdw);
}

GLOBAL.mkdirParentsSync = function (dirname) {
    if (fs.existsSync(dirname))
        return;
    
    var parentName = path.dirname(dirname);
    mkdirParentsSync(parentName);
    
    fs.mkdirSync(dirname);
}

GLOBAL.readFile = function (filename) {
    return fs.readFileSync(filename, "utf8");
}

GLOBAL.writeFile = function (filename, data) {
    var dirname = path.dirname(filename);
    if (!fs.existsSync(dirname))
        mkdirParentsSync(dirname);
    
    return fs.writeFileSync(filename, data);
}

GLOBAL.ejs = require("ejs");

generate(process.argv);
