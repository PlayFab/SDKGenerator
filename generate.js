/// <reference path="node.d.ts"/>
/// <reference path="generate-plugins.ts"/>
/// <reference path="generate-sdk.ts"/>
var ejs;
try
{
    ejs = require("ejs");
}
catch(e)
{
    console.log("ejs not found, try running the install script under SDKBuildScripts/initejs.sh and re-generate");
    process.exit();
}
var fs = require("fs");
var https = require("https");
var path = require("path");
var defaultApiSpecFilePath = "../API_Specs"; // Relative path to Generate.js
var defaultApiSpecGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master";
var defaultAzureApiSpecGitHubUrl = "https://api.github.com/repos/PlayFab/azure-api-specs/contents/";
var defaultApiSpecPlayFabUrl = "https://www.playfabapi.com/apispec";
var tocFilename = "TOC.json";
var tocCacheKey = "TOC";
var specializationTocCacheKey = "specializationTOC";
var defaultSpecialization = "sdk";
var sdkGeneratorGlobals = {
    // Frequently, these are passed by reference to avoid over-use of global variables. Unfortunately, the async nature of loading api files required some global references
    argsByName: {},
    errorMessages: [],
    buildTarget: {
        buildFlags: [],
        destPath: null,
        templateFolder: null,
        targetMaker: null,
        versionKey: null,
        versionString: null,
    },
    apiTemplateDescription: "INVALID",
    apiCache: {},
    sdkDocsByMethodName: {},
    specialization: defaultSpecialization
};
global.sdkGeneratorGlobals = sdkGeneratorGlobals;
var specializationContent;
/////////////////////////////////// The main build sequence for this program ///////////////////////////////////
function parseAndLoadApis() {
    console.log("My args:" + process.argv.join(" "));
    // Step 1
    parseCommandInputs(process.argv, sdkGeneratorGlobals.argsByName, sdkGeneratorGlobals.errorMessages, sdkGeneratorGlobals.buildTarget);
    reportErrorsAndExit(sdkGeneratorGlobals.errorMessages);
    // Kick off Step 2
    loadAndCacheApis(sdkGeneratorGlobals.argsByName, sdkGeneratorGlobals.apiCache);
}
// Wrapper function for Step 3
function generateSdks() {
    if (specializationContent["initializeSpecialization"]) {
        specializationContent["initializeSpecialization"](sdkGeneratorGlobals.apiCache[specializationTocCacheKey]);
    }
    generateApis(sdkGeneratorGlobals.argsByName["buildidentifier"], sdkGeneratorGlobals.buildTarget);
}
function reportErrorsAndExit(errorMessages) {
    if (errorMessages.length === 0)
        return; // No errors to report, so continue
    // Else, report all errors and exit the program
    console.log("Syntax: node generate.js\n\n" +
        "\tCLI Options:\n" +
        "\t(<templateName>=<outputPath>|-destPath <outputPath>)\n" +
        "\t-(apiSpecPath|apiSpecGitUrl|apiSpecPfUrl)[ (<apiSpecPath>|<apiSpecGitUrl>|<apiSpecPfUrl>)]\n" +
        "\t[ -flags <flag>[ <flag> ...]]\n\n" +
        "\t* Where <templateName> is a subfolder within SDKGenerator/privateTemplates -OR- SDKGenerator/targets.\n" +
        "\t* Where <outputPath> is a relative path from the working directory where the SDK is written.\n" +
        "\t* Where <apiSpecPath> is a relative directory or url containing the *.api.json files\n" +
        "\t* If -destPath is used, then genConfig.json must exist in <outputPath>.\n\n" +
        "\tExample: node generate.js unity-v2=../sdks/UnitySDK\n" +
        "\t\tThis builds the UnitySDK, from Specs at the default (GitHub) location\n\n" +
        "\tExample: node generate.js -destPath ../sdks/UnitySDK\n" +
        "\t\tThis builds the UnitySDK, using ../sdks/UnitySDK/genConfig.json for configuration\n\n" +
        "\tYou must list exactly one of: <templateName>=<outputPath> or, -destPath <outputPath>.\n\n" +
        "\tWarning, <templateName> and <outputPath> can not contain spaces.\n");
    console.log("\nError Log:");
    for (var i = 0; i < errorMessages.length; i++)
        console.log(errorMessages[i]);
    console.log("\nPossible template names:");
    var templateList = getAvailableTemplates();
    console.log("\t" + templateList.join(", "));
    process.exit(1);
}
/////////////////////////////////// Major step 1 - Parse and validate command-line inputs ///////////////////////////////////
function parseCommandInputs(args, argsByName, errorMessages, buildTarget) {
    // Parse the command line arguments into key-value-pairs
    extractArgs(args, argsByName, buildTarget, errorMessages);
    // Apply defaults
    if (argsByName.specialization) {
        sdkGeneratorGlobals.specialization = argsByName.specialization;
    }
    var specializationFile = path.resolve("generate-" + sdkGeneratorGlobals.specialization + ".js");
    try {
        specializationContent = require(specializationFile);
        if (!specializationContent) {
            errorMessages.push("Could not load specialization (" + specializationFile + "). Make sure that file has a valid content.");
        }
    }
    catch (err) {
        console.log(err);
        errorMessages.push("Failed to load specialization (" + specializationFile + "). Make sure that file exists.");
    }
    if (!argsByName.hasOwnProperty("apispecpath") && !argsByName.hasOwnProperty("apispecgiturl") && !argsByName.hasOwnProperty("apispecpfurl"))
        argsByName.apispecgiturl = ""; // If nothing is defined, default to GitHub
    // A source key set, with no value means use the default for that input format
    if (argsByName.apispecpath === "")
        argsByName.apispecpath = defaultApiSpecFilePath;
    if (argsByName.apispecgiturl === "")
        argsByName.apispecgiturl = defaultApiSpecGitHubUrl;
    if (argsByName.apispecpfurl === "")
        argsByName.apispecpfurl = defaultApiSpecPlayFabUrl;
    // Output an error if no templates are defined
    if (!buildTarget.destPath)
        errorMessages.push("Build target's destPath not defined.");
    // Output an error if there's any problems with the api-spec source
    var specCount = 0;
    if (argsByName.apispecpath)
        specCount++;
    if (argsByName.apispecgiturl)
        specCount++;
    if (argsByName.apispecpfurl)
        specCount++;
    if (specCount > 1)
        errorMessages.push("Cannot define more than one of: apiSpecPath, apiSpecGitUrl, or apiSpecPfUrl.  Pick one and remove the other(s).");
    // Parse some other values and defaults
    if (!argsByName.buildidentifier)
        argsByName.buildidentifier = "default_manual_build";
    argsByName.buildidentifier = argsByName.buildidentifier.toLowerCase(); // lowercase the buildIdentifier
    if (argsByName.hasOwnProperty("flags"))
        buildTarget.buildFlags = lowercaseFlagsList(argsByName.flags.split(" "));
}
function extractArgs(args, argsByName, buildTarget, errorMessages) {
    var cmdArgs = args.slice(2, args.length); // remove "node.exe generate.js"
    var activeKey = null;
    var specialization;
    for (var i = 0; i < cmdArgs.length; i++) {
        var lcArg = cmdArgs[i].toLowerCase();
        if (cmdArgs[i].indexOf("--") === 0) {
            if (specialization) {
                errorMessages.push("Specialization is already specified: (" + specialization + ") but additional parameter encountered: (" + cmdArgs[i] + ")");
            }
            else {
                specialization = lcArg.substring(2); // remove the "--", lowercase the value
                argsByName["specialization"] = specialization;
            }
        }
        else if (cmdArgs[i].indexOf("-") === 0) {
            activeKey = lcArg.substring(1); // remove the "-", lowercase the argsByName-key
            argsByName[activeKey] = "";
        }
        else if (lcArg.indexOf("=") !== -1) {
            var argPair = cmdArgs[i].split("=", 2);
            tryApplyTarget(argPair[0].toLowerCase(), argPair[1], buildTarget, errorMessages);
        }
        else if (activeKey === null) {
            errorMessages.push("Unexpected token: " + cmdArgs[i]);
        }
        else {
            var temp = argsByName[activeKey];
            if (temp.length > 0)
                argsByName[activeKey] = argsByName[activeKey] + " " + cmdArgs[i];
            else
                argsByName[activeKey] = cmdArgs[i];
        }
    }
    // Pull from environment variables if there's no console-defined targets
    if (!buildTarget.destPath) {
        console.log("argsByName: " + JSON.stringify(argsByName) + ", destPath: " + argsByName["destpath"]);
        if (argsByName["destpath"]) {
            tryApplyTarget(argsByName["templateFolder"], argsByName["destpath"], buildTarget, errorMessages);
        }
        else if (process.env.hasOwnProperty("SdkName")) {
            tryApplyTarget(process.env["SdkSource"], process.env["SdkName"], buildTarget, errorMessages);
        }
        else {
            errorMessages.push("Build target's destPath not defined.");
        }
    }
}
function tryApplyTarget(sdktemplateFolder, destPath, buildTarget, errorMessages) {
    var destPath = path.normalize(destPath);
    if (fs.existsSync(destPath) && !fs.lstatSync(destPath).isDirectory()) {
        errorMessages.push("Invalid target output path: " + destPath);
        return;
    }
    buildTarget.destPath = destPath;
    buildTarget.templateFolder = sdktemplateFolder;
    buildTarget.versionKey = sdktemplateFolder;
    buildTarget.versionString = null;
}
function getMakeScriptForTemplate(buildTarget) {
    var templateSubDirs = ["privateTemplates", "targets"];
    for (var subIdx in templateSubDirs) {
        console.log("Checking: " + __dirname + "/" + templateSubDirs[subIdx] + "/" + buildTarget.templateFolder + "/" + "make.js");
        var targetMain = path.resolve(__dirname, templateSubDirs[subIdx], buildTarget.templateFolder, "make.js");
        if (!fs.existsSync(targetMain))
            continue;
        var targetMaker = require(targetMain);
        if (targetMaker) {
            buildTarget.templateFolder = path.resolve(__dirname, templateSubDirs[subIdx], buildTarget.templateFolder);
            buildTarget.targetMaker = targetMaker;
            return;
        }
    }
    throw Error("SDKGenerator/(privateTemplates|targets)/<templateFolder>/make.js not defined, for templateFolder: " + buildTarget.templateFolder);
}
function getAvailableTemplates() {
    var targetList = [];
    var templateSubDirs = ["privateTemplates", "targets"];
    for (var subIdx in templateSubDirs) {
        var templateRootDir = path.resolve(__dirname, templateSubDirs[subIdx]);
        if (!fs.existsSync(templateRootDir))
            continue;
        var templatesInRoot = fs.readdirSync(templateRootDir);
        for (var i = 0; i < templatesInRoot.length; i++) {
            var eachTemplate = templatesInRoot[i];
            if (eachTemplate[0] === ".")
                continue;
            var eachTemplateDir = path.resolve(templateRootDir, eachTemplate);
            var targetMain = path.resolve(eachTemplateDir, "make.js"); // search for make.js in each subdirectory within "targets"
            if (fs.existsSync(targetMain))
                targetList.push(eachTemplate);
        }
    }
    return targetList;
}
/////////////////////////////////// Major step 2 - Load and cache the API files ///////////////////////////////////
function loadAndCacheApis(argsByName, apiCache) {
    // generateSdks is the function that begins the next step
    if (argsByName.apispecpath) {
        loadApisFromLocalFiles(argsByName, apiCache, argsByName.apispecpath, generateSdks);
    }
    else if (argsByName.apispecgiturl) {
        loadApisFromGitHub(argsByName, apiCache, argsByName.apispecgiturl, generateSdks);
    }
    else if (argsByName.apispecpfurl) {
        loadApisFromPlayFabServer(argsByName, apiCache, argsByName.apispecpfurl, generateSdks);
    }
}
function getSpecializationTocRef(apiCache) {
    var specializationRefs = apiCache[tocCacheKey].specializations;
    if (specializationRefs) {
        for (var i = 0; i < specializationRefs.length; i++) {
            if (specializationRefs[i].name === sdkGeneratorGlobals.specialization) {
                return specializationRefs[i];
            }
        }
    }
    return null;
}
function mapSpecMethods(docObj) {
    var genMethods = docObj.sdkGenMakeMethods;
    for (var i = 0; i < genMethods.length; i++) {
        var funcName = genMethods[i];
        if (!sdkGeneratorGlobals.sdkDocsByMethodName[funcName])
            sdkGeneratorGlobals.sdkDocsByMethodName[funcName] = { funcName: funcName, apiDocKeys: [] };
        sdkGeneratorGlobals.sdkDocsByMethodName[funcName].apiDocKeys.push(docObj.docKey);
    }
}
function loadApisFromLocalFiles(argsByName, apiCache, apiSpecPath, onComplete) {
    function loadEachFile(filename, cacheKey, optional) {
        var fullPath = path.resolve(apiSpecPath, filename);
        console.log("Begin reading File: " + fullPath);
        var fileContents = null;
        try {
            fileContents = require(fullPath);
        }
        catch (err) {
            console.log(" ***** Failed to Load: " + fullPath);
            if (!optional)
                throw err;
        }
        if (fileContents) {
            apiCache[cacheKey] = fileContents;
        }
        console.log("Finished reading: " + fullPath);
    }
    // Load TOC
    loadEachFile(tocFilename, tocCacheKey, false);
    // Load specialization TOC
    var specializationTocRef = getSpecializationTocRef(apiCache);
    if (specializationTocRef) {
        loadEachFile(specializationTocRef.path, specializationTocCacheKey, false);
    }
    // Load TOC docs
    var docList = apiCache[tocCacheKey].documents;
    for (var dIdx = 0; dIdx < docList.length; dIdx++) {
        var genMethods = docList[dIdx].sdkGenMakeMethods;
        if (genMethods) {
            loadEachFile(docList[dIdx].relPath, docList[dIdx].docKey, docList[dIdx].isOptional);
            mapSpecMethods(docList[dIdx]);
        }
    }
    sdkGeneratorGlobals.apiTemplateDescription = "-apiSpecPath " + argsByName.apispecpath;
    catchAndReport(onComplete);
}
function loadApisFromGitHub(argsByName, apiCache, apiSpecGitUrl, onComplete) {
    var finishCountdown = 0;
    function onEachComplete(cacheKey) {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from GitHub");
            sdkGeneratorGlobals.apiTemplateDescription = "-apiSpecGitUrl " + argsByName.apiSpecGitUrl;
            catchAndReport(onComplete);
        }
    }
    function onTocComplete() {
        // Load specialization TOC
        var specializationTocRef = getSpecializationTocRef(apiCache);
        if (specializationTocRef) {
            finishCountdown += 1;
            downloadFromUrl(apiSpecGitUrl, specializationTocRef.path, apiCache, specializationTocCacheKey, onEachComplete, false);
        }
        // Load TOC docs
        var docList = apiCache[tocCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                downloadFromUrl(apiSpecGitUrl, docList[dIdx].relPath, apiCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
                mapSpecMethods(docList[dIdx]);
            }
        }
    }
    // Load TOC
    downloadFromUrl(apiSpecGitUrl, tocFilename, apiCache, tocCacheKey, onTocComplete, false);
}
function loadApisFromPlayFabServer(argsByName, apiCache, apiSpecPfUrl, onComplete) {
    var finishCountdown = 0;
    function onEachComplete() {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from PlayFab Server");
            sdkGeneratorGlobals.apiTemplateDescription = "-apiSpecPfUrl " + argsByName.apispecpfurl;
            catchAndReport(onComplete);
        }
    }
    var specUrl = apiSpecPfUrl.contains("azure") ? defaultAzureApiSpecGitHubUrl : defaultApiSpecGitHubUrl;
    function onTocComplete() {
        // Load specialization TOC
        var specializationTocRef = getSpecializationTocRef(apiCache);
        if (specializationTocRef) {
            finishCountdown += 1;
            downloadFromUrl(specUrl, specializationTocRef.path, apiCache, specializationTocCacheKey, onEachComplete, false);
        }
        // Load TOC docs
        var docList = apiCache[tocCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                if (!docList[dIdx].relPath.contains("SdkManualNotes"))
                    downloadFromUrl(apiSpecPfUrl, docList[dIdx].docKey, apiCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
                else
                    downloadFromUrl(specUrl, docList[dIdx].relPath, apiCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
                mapSpecMethods(docList[dIdx]);
            }
        }
    }
    // Load TOC
    downloadFromUrl(specUrl, tocFilename, apiCache, tocCacheKey, onTocComplete, false);
}
function downloadFromUrl(srcUrl, appendUrl, apiCache, cacheKey, onEachComplete, optional) {
    srcUrl = srcUrl.endsWith("/") ? srcUrl : srcUrl + "/";
    var fullUrl = srcUrl + appendUrl;
    console.log("Begin reading URL: " + fullUrl);
    var rawResponse = "";
    var options = {};
    if (srcUrl.contains(defaultAzureApiSpecGitHubUrl)) {
        options =
            { "headers": {
                "User-Agent": process.env.USERAGENT,
                "Authorization": "token " + process.env.AUTHTOKEN,
                "Accept": "application/vnd.github.raw"
                }
            }
    }
    https.get(fullUrl, options, function (request) {
        request.setEncoding("utf8");
        request.on("data", function (chunk) { rawResponse += chunk; });
        request.on("end", function () {
            console.log("Finished reading: " + fullUrl);
            try {
                apiCache[cacheKey] = JSON.parse(rawResponse);
            }
            catch (jsonErr) {
                console.log(" ***** Failed to parse json: " + rawResponse.trim());
                console.log(" ***** Failed to Load: " + fullUrl);
                if (!optional)
                    throw jsonErr;
            }
            onEachComplete(cacheKey);
        });
        request.on("error", function (reqErr) {
            console.log(" ***** Request failed on: " + fullUrl);
            console.log(reqErr);
            if (!optional)
                throw reqErr;
        });
    });
}
/////////////////////////////////// Major step 3 - Generate the indicated ouptut files ///////////////////////////////////
function generateApis(buildIdentifier, target) {
    console.log("Generating PlayFab APIs from specs: " + sdkGeneratorGlobals.apiTemplateDescription);
    var genConfig = null;
    // This is disabled until we more carefully detect and alert on input conflicts
    var genConfigPath = path.resolve(target.destPath, "genConfig.json");
    try {
        var genConfigFile = require(genConfigPath);
        var genConfigProfileName = sdkGeneratorGlobals.argsByName.hasOwnProperty("genconfigprofilename") ? sdkGeneratorGlobals.argsByName["genconfigprofilename"] : "default";
        genConfig = genConfigFile[genConfigProfileName];
        console.log("Loaded genConfig at: " + genConfigPath + " with profile: " + genConfigProfileName);
        console.log("Config is: " + JSON.stringify(genConfigFile));
    }
    catch (_) {
        console.log("Did not find: " + genConfigPath);
    }
    if (genConfig) {
        if (genConfig.buildFlags)
            target.buildFlags = genConfig.buildFlags.split(" ");
        if (genConfig.templateFolder)
            target.templateFolder = genConfig.templateFolder;
        if (genConfig.versionKey)
            target.versionKey = genConfig.versionKey;
        if (genConfig.versionString)
            target.versionString = genConfig.versionString;
    }
    getMakeScriptForTemplate(target);
    console.log("Making SDK from:\n  - " + target.templateFolder + "\nto:\n  - " + target.destPath);
    // It would probably be better to pass these into the functions, but I don't want to change all the make___Api parameters for all projects today.
    //   For now, just change the global variables in each with the data loaded from SdkManualNotes.json
    if (target.versionKey && !target.versionString) {
        var apiNotes = getApiJson("SdkManualNotes");
        target.versionString = apiNotes.sdkVersion[target.versionKey];
    }
    console.log("BuildTarget: " + JSON.stringify(target));
    sdkGlobals.sdkVersion = target.versionString;
    sdkGlobals.buildIdentifier = buildIdentifier;
    sdkGlobals.buildFlags = target.buildFlags;
    if (sdkGlobals.sdkVersion === null) {
        // The point of this error is to force you to add a line to sdkManualNotes.json, to describe the version and date when this sdk/collection is built
        throw Error("SdkManualNotes does not contain sdkVersion for " + target.templateFolder);
    }
    for (var funcIdx in sdkGeneratorGlobals.sdkDocsByMethodName) {
        var funcName = sdkGeneratorGlobals.sdkDocsByMethodName[funcIdx].funcName;
        var funcDocNames = sdkGeneratorGlobals.sdkDocsByMethodName[funcIdx].apiDocKeys;
        var jsonDocList = [];
        for (var docIdx = 0; docIdx < funcDocNames.length; docIdx++) {
            var apiDefn = getApiDefinition(funcDocNames[docIdx], target.buildFlags);
            if (apiDefn)
                jsonDocList.push(apiDefn);
        }
        if (target.targetMaker[funcName]) {
            console.log(" + Generating " + funcName + " to " + target.destPath);
            if (!fs.existsSync(target.destPath))
                mkdirParentsSync(target.destPath);
            target.targetMaker[funcName](jsonDocList, target.templateFolder, target.destPath);
        }
    }
    console.log("\n\nDONE!\n");
}
function getApiDefinition(cacheKey, buildFlags) {
    var api = getApiJson(cacheKey);
    if (!api || !api.calls)
        return null;
    // Special case, "obsolete" is treated as an SdkGenerator flag, but is not an actual flag in pf-main
    var obsoleteFlaged = false, nonNullableFlagged = false;
    for (var b = 0; b < buildFlags.length; b++) {
        if (buildFlags[b].indexOf("obsolete") !== -1)
            obsoleteFlaged = true;
        if (buildFlags[b].indexOf("nonnullable") !== -1)
            nonNullableFlagged = true;
    }
    var apiFlagConflicts = GetFlagConflicts(buildFlags, api, obsoleteFlaged, nonNullableFlagged);
    if (apiFlagConflicts) {
        console.log("** Skipping Flagged API: " + api.name + ": " + apiFlagConflicts);
        return null;
    }
    // Filter calls out of the API before returning it
    var filteredCalls = [];
    for (var cIdx = 0; cIdx < api.calls.length; cIdx++) {
        var callFlagConflicts = GetFlagConflicts(buildFlags, api.calls[cIdx], obsoleteFlaged, nonNullableFlagged);
        if (!callFlagConflicts)
            filteredCalls.push(api.calls[cIdx]);
        else
            console.log("** Skipping Flagged Method: " + api.name + "." + api.calls[cIdx].name + ": " + callFlagConflicts);
    }
    api.calls = filteredCalls;
    // Filter datatypes out of the API before returning it
    var filteredTypes = {};
    for (var dIdx in api.datatypes) {
        var typeFlagConflicts = GetFlagConflicts(buildFlags, api.datatypes[dIdx], obsoleteFlaged, nonNullableFlagged);
        if (!typeFlagConflicts) {
            var eachType = api.datatypes[dIdx];
            var filteredProperties = [];
            if (eachType.properties) {
                for (var pIdx = 0; pIdx < eachType.properties.length; pIdx++)
                    if (!GetFlagConflicts(buildFlags, eachType.properties[pIdx], obsoleteFlaged, nonNullableFlagged))
                        filteredProperties.push(eachType.properties[pIdx]);
                eachType.properties = filteredProperties;
            }
            filteredTypes[api.datatypes[dIdx].className] = eachType;
        }
        else
            console.log("** Skipping Flagged Method: " + api.name + "." + api.datatypes[dIdx].className + ": " + typeFlagConflicts);
    }
    api.datatypes = filteredTypes;
    return api;
}
function GetFlagConflicts(buildFlags, apiObj, obsoleteFlaged, nonNullableFlagged) {
    // Filter obsolete elements
    if (!obsoleteFlaged && apiObj.hasOwnProperty("deprecation")) {
        var obsoleteTime = new Date(apiObj.deprecation.ObsoleteAfter);
        if (new Date() > obsoleteTime)
            return "deprecation";
    }
    // Filter governing booleans
    if (!nonNullableFlagged && apiObj.hasOwnProperty("GovernsProperty"))
        return "governs";
    // It's pretty easy to exclude (Api calls and datatypes)
    var exclusiveFlags = [];
    if (apiObj.hasOwnProperty("ExclusiveFlags"))
        exclusiveFlags = lowercaseFlagsList(apiObj.ExclusiveFlags);
    for (var bIdx = 0; bIdx < buildFlags.length; bIdx++)
        if (exclusiveFlags.indexOf(buildFlags[bIdx]) !== -1)
            return apiObj.ExclusiveFlags;
    // All Inclusive flags must match if present (Api calls only)
    var allInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AllInclusiveFlags"))
        allInclusiveFlags = lowercaseFlagsList(apiObj.AllInclusiveFlags);
    if (allInclusiveFlags.length !== 0)
        for (var alIdx = 0; alIdx < allInclusiveFlags.length; alIdx++)
            if (buildFlags.indexOf(allInclusiveFlags[alIdx]) === -1)
                return apiObj.AllInclusiveFlags; // If a required flag is missing, fail out
    // Any Inclusive flags must match at least one if present (Api calls, datatypes, and properties)
    var anyInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AnyInclusiveFlags"))
        anyInclusiveFlags = lowercaseFlagsList(apiObj.AnyInclusiveFlags);
    if (anyInclusiveFlags.length === 0)
        return null; // If there's no flags, it is always included
    for (var anIdx = 0; anIdx < anyInclusiveFlags.length; anIdx++)
        if (buildFlags.indexOf(anyInclusiveFlags[anIdx]) !== -1)
            return null; // At least one flag must be present - which we just found
    return apiObj.AnyInclusiveFlags;
}
/////////////////////////////////// RANDOM INTERNAL UTILITIES used locally ///////////////////////////////////
function lowercaseFlagsList(flags) {
    var output = [];
    for (var i = 0; i < flags.length; i++)
        output.push(flags[i].toLowerCase());
    return output;
}
function mkdirParentsSync(dirname) {
    if (fs.existsSync(dirname))
        return;
    var parentName = path.dirname(dirname);
    mkdirParentsSync(parentName);
    fs.mkdirSync(dirname);
}
// String utilities
String.prototype.replaceAll = function (search, replacement) {
    return this.replace(new RegExp(search, "g"), replacement);
};
String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
String.prototype.contains = function (search) {
    return this.indexOf(search) > -1;
};
/**
 * Word wraps a string to fit a particular width
 * @param width Number, default 120
 * @param brk string, inserted on wrap locations, default newline
 * @param cut boolean, default false, I think it removes everything after the wordwrap, instead of inserting brk
 * @returns {string}
 */
String.prototype.wordWrap = function (width, brk, cut) {
    brk = brk || "\n";
    width = width || 120;
    cut = cut || false;
    var regex = '.{1,' + width + '}(\\s|$)' + (cut ? '|.{' + width + '}|.+$' : '|\\S+?(\\s|$)');
    var regres = this.match(RegExp(regex, 'g'));
    if (regres) {
        var filtered = [];
        for (var i = 0; i < regres.length; i++) {
            if (!regres[i])
                continue;
            var trimmedLine = regres[i].trim();
            if (trimmedLine.length > 0)
                filtered.push(trimmedLine);
        }
        return filtered.join(brk);
    }
    return this;
};
// Official padStart implementation
// https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
// https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
        padString = String((typeof padString !== 'undefined' ? padString : ' '));
        if (this.length > targetLength) {
            return String(this);
        }
        else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}
// SDK generation utilities
function templatizeTree(locals, sourcePath, destPath, excludeFolders, excludeFiles) {
    if (!fs.existsSync(sourcePath))
        throw Error("Copy tree source doesn't exist: " + sourcePath);
    if (!fs.lstatSync(sourcePath).isDirectory())
        return copyOrTemplatizeFile(locals, sourcePath, destPath);
    // Directory
    if (!fs.existsSync(destPath))
        mkdirParentsSync(destPath);
    else if (!fs.lstatSync(destPath).isDirectory())
        throw Error("Can't copy a directory onto a file: " + sourcePath + " " + destPath);
        var filesInDir = fs.readdirSync(sourcePath);
        for (var i = 0; i < filesInDir.length; i++) {
            var filename = filesInDir[i];
            var file = sourcePath + "/" + filename;
    
            
    
            
    
            if (fs.lstatSync(file).isDirectory()) {
                var folderExcluded = false;
                if(excludeFolders != null)
                {
                    for(var excludedFolderIndex = 0; excludedFolderIndex < excludeFolders.length; excludedFolderIndex++)
                    {
                        if(excludeFolders[excludedFolderIndex] == filename)
                        {
                            folderExcluded = true;
                            break;
                        }
                    }
                }
                if (folderExcluded)
                    continue;
                templatizeTree(locals, file, destPath + "/" + filename, excludeFolders, excludeFiles);
            }
            else {
                var fileExcluded = false;
                if(excludeFiles != null )
                {
                    for(var excludedFileIndex = 0; excludedFileIndex < excludeFiles.length; excludedFileIndex++)
                    {
                        if(excludeFiles[excludedFileIndex] == filename)
                        {
                            fileExcluded = true;
                            break;
                        }
                    }
                }
                if (fileExcluded)
                    continue;
                copyOrTemplatizeFile(locals, file, destPath + "/" + filename);
            }
        }
}
global.templatizeTree = templatizeTree;
function copyOrTemplatizeFile(locals, sourceFile, destFile) {
    checkFileCopy(sourceFile, destFile);
    if (!sourceFile.endsWith(".ejs"))
        return copyFile(sourceFile, destFile);
    var template = getCompiledTemplate(sourceFile);
    writeFile(destFile.substr(0, destFile.length - 4), template(locals));
}
function copyTree(sourcePath, destPath) {
    if (!fs.existsSync(sourcePath))
        throw Error("Copy tree source doesn't exist: " + sourcePath);
    if (!fs.lstatSync(sourcePath).isDirectory())
        return copyFile(sourcePath, destPath);
    // Directory
    if (!fs.existsSync(destPath))
        mkdirParentsSync(destPath);
    else if (!fs.lstatSync(destPath).isDirectory())
        throw Error("Can't copy a directory onto a file: " + sourcePath + " " + destPath);
    var filesInDir = fs.readdirSync(sourcePath);
    for (var i = 0; i < filesInDir.length; i++) {
        var filename = filesInDir[i];
        var file = sourcePath + "/" + filename;
        if (fs.lstatSync(file).isDirectory())
            copyTree(file, destPath + "/" + filename);
        else
            copyFile(file, destPath);
    }
}
global.copyTree = copyTree;
function copyFile(sourceFile, destPath) {
    checkFileCopy(sourceFile, destPath);
    var filename = path.basename(sourceFile);
    if (fs.existsSync(destPath)) {
        if (fs.lstatSync(destPath).isDirectory()) {
            destPath += "/" + filename;
        }
    }
    else {
        if (destPath[destPath.length - 1] === "/" || destPath[destPath.length - 1] === "\\") {
            mkdirParentsSync(destPath);
            destPath += filename;
        }
        else {
            mkdirParentsSync(path.dirname(destPath));
        }
    }
    var bufLength = 64 * 1024;
    var buff = new Buffer(bufLength);
    var fdr = fs.openSync(sourceFile, "r");
    var fdw = fs.openSync(destPath, "w");
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
function checkFileCopy(sourceFile, destFile) {
    if (!sourceFile || !destFile)
        throw Error("ERROR: Invalid copy file parameters: " + sourceFile + " " + destFile);
    if (!fs.existsSync(sourceFile))
        throw Error("ERROR: copyFile source doesn't exist: " + sourceFile);
    if (fs.lstatSync(sourceFile).isDirectory())
        throw Error("ERROR: copyFile source is a directory: " + sourceFile);
}
function readFile(filename) {
    return fs.readFileSync(filename, "utf8");
}
global.readFile = readFile;
function writeFile(filename, data) {
    var dirname = path.dirname(filename);
    if (!fs.existsSync(dirname))
        mkdirParentsSync(dirname);
    return fs.writeFileSync(filename, data);
}
global.writeFile = writeFile;
/**
 * Wrapper function for boilerplate of compiling templates
 * Also Caches the Templates to avoid reloading and recompiling
 * */
function getCompiledTemplate(templatePath, includes = false) {
    if (!this.compiledTemplates)
        this.compiledTemplates = {};
    if (!this.compiledTemplates.hasOwnProperty(templatePath))
        if (includes)
            this.compiledTemplates[templatePath] = ejs.compile(readFile(templatePath), { filename: templatePath });
        else
            this.compiledTemplates[templatePath] = ejs.compile(readFile(templatePath), { filename: templatePath });
    return this.compiledTemplates[templatePath];
}
global.getCompiledTemplate = getCompiledTemplate;
function catchAndReport(method) {
    try {
        method();
    }
    catch (error) {
        console.error(error);
        setTimeout(function () { throw error; }, 30000);
    }
}
// Kick everything off
catchAndReport(parseAndLoadApis);
setTimeout(function () { }, 5000);
//# sourceMappingURL=generate.js.map