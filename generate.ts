var ejs = require("ejs");
var fs = require("fs");
var https = require("https");
var path = require("path");

ejs.delimiter = "\n";

var SdkGeneratorGlobals = {
    // Frequently, these are passed by reference to avoid over-use of global variables. Unfortunately, the async nature of loading api files required some global references

    // Internal note: We lowercase the argsByName-keys, targetNames, buildIdentifier, and the flags.  Case is maintained for all other argsByName-values, and targets
    argsByName: {}, // Command line args compiled into KVP's
    errorMessages: [], // String list of errors during parsing and loading steps
    targetOutputPathList: [], // A list of objects that describe sdk targets to build
    buildFlags: [], // The sdkBuildFlags which modify the list of APIs available in this build of the SDK
    apiSrcDescription: "INVALID", // Assigned if/when the api-spec source is fetched properly
    apiCache: {} // We have to pre-cache the api-spec files, because latter steps (like ejs) can't run asynchronously
};

var DefaultApiSpecFilePath = "../API_Specs"; // Relative path to Generate.js
var DefaultApiSpecGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master/";
var DefaultApiSpecPlayFabUrl = "https://www.playfabapi.com/apispec/";

/////////////////////////////////// The main build sequence for this program ///////////////////////////////////
function ParseAndLoadApis() {
    // Step 1
    ParseCommandInputs(process.argv, SdkGeneratorGlobals.argsByName, SdkGeneratorGlobals.errorMessages, SdkGeneratorGlobals.targetOutputPathList);
    ReportErrorsAndExit(SdkGeneratorGlobals.errorMessages);

    // Kick off Step 2
    LoadAndCacheApis(SdkGeneratorGlobals.argsByName, SdkGeneratorGlobals.apiCache);
}

// Wrapper function for Step 3
function GenerateSdks() {
    GenerateApis(SdkGeneratorGlobals.argsByName["buildidentifier"], SdkGeneratorGlobals.targetOutputPathList, SdkGeneratorGlobals.buildFlags, SdkGeneratorGlobals.apiSrcDescription);
}

function ReportErrorsAndExit(errorMessages) {
    if (errorMessages.length === 0)
        return; // No errors to report, so continue

    // Else, report all errors and exit the program
    console.log("Synatax: node generate.js\n" +
        "\t\t<targetName>=<targetOutputPath>\n" +
        "\t\t-(apiSpecPath|apiSpecGitUrl|apiSpecPfUrl)[ (<apiSpecPath>|<apiSpecGitUrl>|<apiSpecPfUrl>)]\n" +
        "\t\t[ -flags <flag>[ <flag> ...]]\n\n" +
        "\tExample: node generate.js unity-v2=../sdks/UnitySDK -apiSpecPath ../API_Specs -flags xbox playstation\n" +
        "\t\tThis builds the UnitySDK, from Specs at relative path ../API_Specs, with console APIs included\n" +
        "\t<apiSpecPath> : Directory or url containing the *.api.json files\n" +
        "\tYou must list one or more <targetName>=<targetOutputPath> arguments.\n" +
        "\tWarning, there can be no spaces in the target-specification\n");

    console.log("\nError Log:");
    for (var i = 0; i < errorMessages.length; i++)
        console.log(errorMessages[i]);

    console.log("\nPossible targetNames:");
    var targetList = GetTargetsList();
    console.log("\t" + targetList.join(", "));
    process.exit(1);
}

/////////////////////////////////// Major step 1 - Parse and validate command-line inputs ///////////////////////////////////
function ParseCommandInputs(args, argsByName, errorMessages, targetOutputPathList) {
    // Parse the command line arguments into key-value-pairs
    ExtractArgs(args, argsByName, targetOutputPathList, errorMessages);

    // Apply defaults 
    if (!argsByName.hasOwnProperty("apispecpath") && !argsByName.hasOwnProperty("apispecgiturl") && !argsByName.hasOwnProperty("apispecpfurl"))
        argsByName.apispecgiturl = ""; // If nothing is defined, default to GitHub
    // A source key set, with no value means use the default for that input format
    if (argsByName.apispecpath === "")
        argsByName.apispecpath = DefaultApiSpecFilePath;
    if (argsByName.apispecgiturl === "")
        argsByName.apispecgiturl = DefaultApiSpecGitHubUrl;
    if (argsByName.apispecpfurl === "")
        argsByName.apispecpfurl = DefaultApiSpecPlayFabUrl;

    // Output an error if no targets are defined
    if (targetOutputPathList.length === 0)
        errorMessages.push("No targets defined, you must define at least one.");

    // Output an error if there's any problems with the api-spec source    
    var specCount = 0;
    if (argsByName.apispecpath) specCount++;
    if (argsByName.apispecgiturl) specCount++;
    if (argsByName.apispecpfurl) specCount++;
    if (specCount > 1)
        errorMessages.push("Cannot define more than one of: apiSpecPath, apiSpecGitUrl, or apiSpecPfUrl.  Pick one and remove the other(s).");

    // Parse some other values and defaults
    if (!argsByName.buildidentifier)
        argsByName.buildidentifier = "default_manual_build";
    argsByName.buildidentifier = argsByName.buildidentifier.toLowerCase(); // lowercase the buildIdentifier
    if (argsByName.hasOwnProperty("flags"))
        SdkGeneratorGlobals.buildFlags = LowercaseFlagsList(argsByName.flags.split(" "));
}

function ExtractArgs(args, argsByName, targetOutputPathList, errorMessages) {
    var cmdArgs = args.slice(2, args.length); // remove "node.exe generate.js"
    var activeKey = null;
    for (var i = 0; i < cmdArgs.length; i++) {
        var lcArg = cmdArgs[i].toLowerCase();
        if (cmdArgs[i].indexOf("-") === 0) {
            activeKey = lcArg.substring(1); // remove the "-", lowercase the argsByName-key
            argsByName[activeKey] = "";
        } else if (lcArg.indexOf("=") !== -1) { // any parameter with an "=" is assumed to be a target specification, lowercase the targetName
            var argPair = cmdArgs[i].split("=", 2);
            CheckTarget(argPair[0].toLowerCase(), argPair[1], targetOutputPathList, errorMessages);
        } else if ((lcArg === "c:\\depot\\api_specs" || lcArg === "..\\api_specs") && activeKey === null && !argsByName.hasOwnProperty("apispecpath")) { // Special case to handle old API-Spec path as fixed 3rd parameter - DEPRECATED
            argsByName["apispecpath"] = cmdArgs[i];
        } else if (activeKey === null) {
            errorMessages.push("Unexpected token: " + cmdArgs[i]);
        } else {
            var temp = argsByName[activeKey];
            if (temp.length > 0)
                argsByName[activeKey] = argsByName[activeKey] + " " + cmdArgs[i];
            else
                argsByName[activeKey] = cmdArgs[i];
        }
    }

    // Pull from environment variables if there's no console-defined targets
    if (targetOutputPathList.length === 0 && process.env.hasOwnProperty("SdkSource") && process.env.hasOwnProperty("SdkName")) {
        CheckTarget(process.env.hasOwnProperty("SdkSource"), process.env.hasOwnProperty("SdkName"), targetOutputPathList, errorMessages);
    }
}

interface ITargetOutput {
    name: string,
    dest: string
}
function CheckTarget(sdkSource, sdkDestination, targetOutputPathList, errorMessages) {
    var targetOutput: ITargetOutput = {
        name: sdkSource,
        dest: path.normalize(sdkDestination)
    };
    if (fs.existsSync(targetOutput.dest) && !fs.lstatSync(targetOutput.dest).isDirectory()) {
        errorMessages.push("Invalid target output path: " + targetOutput.dest);
    } else {
        targetOutputPathList.push(targetOutput);
    }
}

function GetTargetsList() {
    var targetList = [];

    var targetsDir = path.resolve(__dirname, "targets");

    var targets = fs.readdirSync(targetsDir);
    for (var i = 0; i < targets.length; i++) {
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

/////////////////////////////////// Major step 2 - Load and cache the API files ///////////////////////////////////
function LoadAndCacheApis(argsByName, apiCache) {
    // GenerateSdks is the function that begins the next step

    if (argsByName.apispecpath) {
        LoadApisFromLocalFiles(argsByName, apiCache, argsByName.apispecpath, GenerateSdks);
    } else if (argsByName.apispecgiturl) {
        LoadApisFromGitHub(argsByName, apiCache, argsByName.apispecgiturl, GenerateSdks);
    } else if (argsByName.apispecpfurl) {
        LoadApisFromPlayFabServer(argsByName, apiCache, argsByName.apispecpfurl, GenerateSdks);
    }
}

function LoadApisFromLocalFiles(argsByName, apiCache, apiSpecPath, onComplete) {
    function loadEachFile(filename) {
        var fullPath = path.resolve(apiSpecPath, filename);
        console.log("Begin reading: " + fullPath);
        apiCache[filename] = require(fullPath);
        console.log("Finished reading: " + fullPath);
    }

    loadEachFile("Admin.api.json");
    loadEachFile("Client.api.json");
    loadEachFile("Matchmaker.api.json");
    loadEachFile("Server.api.json");
    loadEachFile("PlayStreamEventModels.json");
    loadEachFile("PlayStreamCommonEventModels.json");
    loadEachFile("PlayStreamProfileModels.json");
    loadEachFile("SdkManualNotes.json");

    SdkGeneratorGlobals.apiSrcDescription = argsByName.apispecpath;
    onComplete();
}

function LoadApisFromGitHub(argsByName, apiCache, apiSpecGitUrl, onComplete) {
    var finishCountdown = 8;
    function onEachComplete() {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from GitHub");
            SdkGeneratorGlobals.apiSrcDescription = argsByName.apiSpecGitUrl;
            onComplete();
        }
    }

    DownloadFromUrl(apiSpecGitUrl, "Admin.api.json", apiCache, "Admin.api.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "Client.api.json", apiCache, "Client.api.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "Matchmaker.api.json", apiCache, "Matchmaker.api.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "Server.api.json", apiCache, "Server.api.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "PlayStreamEventModels.json", apiCache, "PlayStreamEventModels.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "PlayStreamCommonEventModels.json", apiCache, "PlayStreamCommonEventModels.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "PlayStreamProfileModels.json", apiCache, "PlayStreamProfileModels.json", onEachComplete);
    DownloadFromUrl(apiSpecGitUrl, "SdkManualNotes.json", apiCache, "SdkManualNotes.json", onEachComplete);
}

function LoadApisFromPlayFabServer(argsByName, apiCache, apiSpecPfUrl, onComplete) {
    var finishCountdown = 8;
    function onEachComplete() {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from PlayFab Server");
            SdkGeneratorGlobals.apiSrcDescription = argsByName.apispecpfurl;
            onComplete();
        }
    }

    DownloadFromUrl(apiSpecPfUrl, "AdminAPI", apiCache, "Admin.api.json", onEachComplete);
    DownloadFromUrl(apiSpecPfUrl, "ClientAPI", apiCache, "Client.api.json", onEachComplete);
    DownloadFromUrl(apiSpecPfUrl, "MatchmakerAPI", apiCache, "Matchmaker.api.json", onEachComplete);
    DownloadFromUrl(apiSpecPfUrl, "ServerAPI", apiCache, "Server.api.json", onEachComplete);
    DownloadFromUrl(apiSpecPfUrl, "PlayStreamEventModels", apiCache, "PlayStreamEventModels.json", onEachComplete);
    DownloadFromUrl(apiSpecPfUrl, "PlayStreamCommonEventModels", apiCache, "PlayStreamCommonEventModels.json", onEachComplete);
    DownloadFromUrl(apiSpecPfUrl, "PlayStreamProfileModel", apiCache, "PlayStreamProfileModels.json", onEachComplete);
    // This file isn't on the pf-server, and it couldn't be accurate there either way
    DownloadFromUrl(DefaultApiSpecGitHubUrl, "SdkManualNotes.json", apiCache, "SdkManualNotes.json", onEachComplete);
}

function DownloadFromUrl(srcUrl, appendUrl, apiCache, cacheKey, onEachComplete) {
    var fullUrl = srcUrl + appendUrl;
    console.log("Begin reading: " + fullUrl);
    var rawResponse = "";
    https.get(fullUrl, function (request) {
        request.setEncoding("utf8");
        request.on("data", function (chunk) { rawResponse += chunk; });
        request.on("end", function () {
            console.log("Finished reading: " + fullUrl);
            try {
                apiCache[cacheKey] = JSON.parse(rawResponse);
            } catch (jsonErr) {
                console.log("Failed to parse json on: " + fullUrl);
                throw jsonErr;
            }
            onEachComplete();
        });
        request.on('error', function (reqErr) {
            console.log("Request failed on: " + fullUrl);
            console.log(reqErr);
        });
    });
}

/////////////////////////////////// Major step 3 - Generate the indicated ouptut files ///////////////////////////////////
function GenerateApis(buildIdentifier, targetOutputPathList, buildFlags, apiSrcDescription) {
    console.log("Generating PlayFab APIs from specs: " + apiSrcDescription);

    var clientApi = GetApiDefinition("Client.api.json", buildFlags);
    var adminApis = [
        GetApiDefinition("Admin.api.json", buildFlags)
    ];
    var serverApis = [
        GetApiDefinition("Admin.api.json", buildFlags),
        GetApiDefinition("Matchmaker.api.json", buildFlags),
        GetApiDefinition("Server.api.json", buildFlags)
    ];

    var allApis = serverApis.concat(clientApi);

    var targetsDir = path.resolve(__dirname, "targets");

    for (var t = 0; t < targetOutputPathList.length; t++) {
        var target = targetOutputPathList[t];

        var sdkOutputDir = target.dest;

        console.log("Target: " + targetsDir + ", and " + target.name);
        var targetSourceDir = path.resolve(targetsDir, target.name);
        var targetMain = path.resolve(targetSourceDir, "make.js");

        console.log("Making target " + target.name + " to location " + sdkOutputDir);
        var targetMaker = require(targetMain);

        // It would probably be better to pass these into the functions, but I don't want to change all the make___Api parameters for all projects today.
        //   For now, just change the global variables in each with the data loaded from SdkManualNotes.json
        targetMaker.apiNotes = GetApiJson("SdkManualNotes.json");
        targetMaker.sdkVersion = targetMaker.apiNotes.sdkVersion[target.name];
        targetMaker.buildIdentifier = buildIdentifier;
        if (targetMaker.sdkVersion === null) {
            throw "SdkManualNotes does not contain sdkVersion for " + target.name; // The point of this error is to force you to add a line to sdkManualNotes.json, to describe the version and date when this sdk/collection is built
        }

        var apiOutputDir = "";

        if (targetMaker.makeClientAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabClientSDK");
            console.log(" + Generating Client to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                MkdirParentsSync(apiOutputDir);
            targetMaker.makeClientAPI(clientApi, targetSourceDir, apiOutputDir);
        }

        if (targetMaker.makeServerAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabServerSDK");
            console.log(" + Generating Server to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                MkdirParentsSync(apiOutputDir);
            targetMaker.makeServerAPI(serverApis, targetSourceDir, apiOutputDir);
        }

        if (targetMaker.makeAdminAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabServerSDK");
            console.log(" + Generating Server to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                MkdirParentsSync(apiOutputDir);
            targetMaker.makeAdminAPI(adminApis, targetSourceDir, apiOutputDir);
        }

        if (targetMaker.makeCombinedAPI) {
            apiOutputDir = targetMaker.putInRoot ? sdkOutputDir : path.resolve(sdkOutputDir, "PlayFabSDK");
            console.log(" + Generating Combined to " + apiOutputDir);
            if (!fs.existsSync(apiOutputDir))
                MkdirParentsSync(apiOutputDir);
            targetMaker.makeCombinedAPI(allApis, targetSourceDir, apiOutputDir);
        }
    }

    console.log("\n\nDONE!\n");
}

function GetApiDefinition(apiFileName, buildFlags) {
    var api = GetApiJson(apiFileName);

    // Special case, "obsolete" is treated as an SdkGenerator flag, but is not an actual flag in pf-main
    var obsoleteFlaged = false, nonNullableFlagged = false;
    for (var b = 0; b < buildFlags.length; b++) {
        if (buildFlags[b].indexOf("obsolete") !== -1)
            obsoleteFlaged = true;
        if (buildFlags[b].indexOf("nonnullable") !== -1)
            nonNullableFlagged = true;
    }

    // Filter calls out of the API before returning it
    var filteredCalls = [];
    for (var cIdx in api.calls)
        if (IsVisibleWithFlags(buildFlags, api.calls[cIdx], obsoleteFlaged, nonNullableFlagged))
            filteredCalls.push(api.calls[cIdx]);
    api.calls = filteredCalls;

    // Filter datatypes out of the API before returning it
    var filteredTypes = {};
    for (var dIdx in api.datatypes) {
        if (IsVisibleWithFlags(buildFlags, api.datatypes[dIdx], obsoleteFlaged, nonNullableFlagged)) {
            var eachType = api.datatypes[dIdx];
            var filteredProperties = [];
            if (eachType.properties) {
                for (var pIdx = 0; pIdx < eachType.properties.length; pIdx++)
                    if (IsVisibleWithFlags(buildFlags, eachType.properties[pIdx], obsoleteFlaged, nonNullableFlagged))
                        filteredProperties.push(eachType.properties[pIdx]);
                eachType.properties = filteredProperties;
            }
            filteredTypes[api.datatypes[dIdx].className] = eachType;
        }
    }
    api.datatypes = filteredTypes;
    return api;
}

function IsVisibleWithFlags(buildFlags, apiObj, obsoleteFlaged, nonNullableFlagged) {
    // Filter obsolete elements
    if (!obsoleteFlaged && apiObj.hasOwnProperty("deprecation")) {
        var obsoleteTime = new Date(apiObj.deprecation.ObsoleteAfter);
        if (new Date() > obsoleteTime)
            return false;
    }
    // Filter governing booleans
    if (!nonNullableFlagged && apiObj.hasOwnProperty("GovernsProperty"))
        return false;

    // It's pretty easy to exclude (Api calls and datatypes)
    var exclusiveFlags = [];
    if (apiObj.hasOwnProperty("ExclusiveFlags"))
        exclusiveFlags = LowercaseFlagsList(apiObj.ExclusiveFlags);
    for (var bIdx = 0; bIdx < buildFlags.length; bIdx++)
        if (exclusiveFlags.indexOf(buildFlags[bIdx]) !== -1)
            return false;

    // All Inclusive flags must match if present (Api calls only)
    var allInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AllInclusiveFlags"))
        allInclusiveFlags = LowercaseFlagsList(apiObj.AllInclusiveFlags);
    if (allInclusiveFlags.length !== 0) // If there's no flags, it is always included
        for (var alIdx = 0; alIdx < allInclusiveFlags.length; alIdx++)
            if (buildFlags.indexOf(allInclusiveFlags[alIdx]) === -1)
                return false; // If a required flag is missing, fail out

    // Any Inclusive flags must match at least one if present (Api calls and datatypes)
    var anyInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AnyInclusiveFlags"))
        anyInclusiveFlags = LowercaseFlagsList(apiObj.AnyInclusiveFlags);
    if (anyInclusiveFlags.length === 0)
        return true; // If there's no flags, it is always included
    for (var anIdx = 0; anIdx < anyInclusiveFlags.length; anIdx++)
        if (buildFlags.indexOf(anyInclusiveFlags[anIdx]) !== -1)
            return true; // Otherwise at least one flag must be present
    return false;
}

/////////////////////////////////// RANDOM INTERNAL UTILITIES used locally ///////////////////////////////////

function LowercaseFlagsList(flags) {
    var output = [];
    for (var i = 0; i < flags.length; i++)
        output.push(flags[i].toLowerCase());
    return output;
}

function MkdirParentsSync(dirname) {
    if (fs.existsSync(dirname))
        return;

    var parentName = path.dirname(dirname);
    MkdirParentsSync(parentName);
    fs.mkdirSync(dirname);
}

/////////////////////////////////// GLOBAL UTILITIES used by make.js and other target-specific files ///////////////////////////////////

interface String {
    replaceAll(search: string, replacement: string): string;
    endsWith(search: string): boolean;
    contains(search: string): boolean;
}

// String utilities
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.contains = function (search) {
    return this.indexOf(search) > -1;
}

// SDK generation utilities
var copyTree = function (source, dest) {
    if (!fs.existsSync(source)) {
        console.error("Copy tree source doesn't exist: " + source);
        return;
    }

    if (fs.lstatSync(source).isDirectory()) {
        if (!fs.existsSync(dest)) {
            MkdirParentsSync(dest);
        }
        else if (!fs.lstatSync(dest).isDirectory()) {
            console.error("Can't copy a directory onto a file: " + source + " " + dest);
            return;
        }


        var filesInDir = fs.readdirSync(source);
        for (var i = 0; i < filesInDir.length; i++) {
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
global.copyTree = copyTree;

var copyFile = function (source, dest) {
    if (!source || !dest) {
        console.error("ERROR: Invalid copy file parameters: " + source + " " + dest);
        return;
    }

    if (!fs.existsSync(source)) {
        console.error("ERROR: copyFile source doesn't exist: " + source);
        return;
    }
    var sourceStat = fs.lstatSync(source);

    if (sourceStat.isDirectory()) {
        console.error("ERROR: copyFile source is a directory: " + source);
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
            MkdirParentsSync(dest);
            dest += filename;
        }
        else {
            var dirname = path.dirname(dest);
            MkdirParentsSync(dirname);
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
global.copyFile = copyFile;

// Returns one of: Null, "Proposed", "Deprecated", "Obsolete"
global.GetDeprecationStatus = function (apiObj) {
    var deprecation = apiObj.hasOwnProperty("deprecation");
    if (!deprecation)
        return null;

    var deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var obsoleteTime = new Date(apiObj.deprecation.ObsoleteAfter);
    if (new Date() > obsoleteTime)
        return "Obsolete";
    if (new Date() > deprecationTime)
        return "Deprecated";
    return "Proposed";
}

var readFile = function (filename) {
    return fs.readFileSync(filename, "utf8");
}
global.readFile = readFile;

global.writeFile = function (filename, data) {
    var dirname = path.dirname(filename);
    if (!fs.existsSync(dirname))
        MkdirParentsSync(dirname);

    return fs.writeFileSync(filename, data);
}

// Fetch the object parsed from an api-file, from the cache (can't load synchronously from URL-options, so we have to pre-cache them)
var GetApiJson = function (apiFileName) {
    return SdkGeneratorGlobals.apiCache[apiFileName];
}
global.GetApiJson = GetApiJson;

/**
 * Wrapper function for boilerplate of compiling templates
 * Also Caches the Templates to avoid reloading and recompiling
 * */
global.GetCompiledTemplate = function (templatePath) : any {
    if (!this.compiledTemplates)
        this.compiledTemplates = {};
    if (!this.compiledTemplates.hasOwnProperty(templatePath))
        this.compiledTemplates[templatePath] = ejs.compile(readFile(templatePath));
    return this.compiledTemplates[templatePath];
}

// Kick everything off
ParseAndLoadApis();
