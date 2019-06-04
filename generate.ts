var ejs = require("ejs");
var fs = require("fs");
var https = require("https");
var path = require("path");

ejs.delimiter = "\n";

interface SpecializationTocRef {
    name: string;
    path: string;
}

interface SdkDoc {
    funcName: string;
    apiDocKeys: string[];
}

interface SdkGenGlobals {
    argsByName: { [key: string]: string; };
    errorMessages: string[];
    buildTarget: IBuildTarget;
    apiSrcDescription: string;
    apiCache: { [key: string]: any; }
    sdkDocsByMethodName: { [key: string]: SdkDoc; }
    specialization: string;
    unitySubfolder: string;
}

const defaultApiSpecFilePath = "../API_Specs"; // Relative path to Generate.js
const defaultApiSpecGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master";
const defaultApiSpecPlayFabUrl = "https://www.playfabapi.com/apispec";
const tocFilename = "TOC.json";
const tocCacheKey = "TOC";
const specializationTocCacheKey = "specializationTOC";
const defaultSpecialization = "sdk";


var sdkGeneratorGlobals: SdkGenGlobals = {
    // Frequently, these are passed by reference to avoid over-use of global variables. Unfortunately, the async nature of loading api files required some global references

    // Internal note: We lowercase the argsByName-keys, targetNames, buildIdentifier, and the flags.  Case is maintained for all other argsByName-values, and targets
    argsByName: {}, // Command line args compiled into KVP's
    errorMessages: [], // String list of errors during parsing and loading steps
    buildTarget: {
        buildFlags: [], // The flags applied to this build
        destPath: null, // The path to the destination (usually a git repo)
        srcFolder: null, // The SdkGenerator/targets/subfolder
        versionKey: null, // The key in the API_Specs/SdkManualNotes.json file that has the version for this SDK
        versionString: null, // The actual version string, from SdkManualNotes, or from another appropriate input
    }, // Describes where and how to build the target
    apiSrcDescription: "INVALID", // Assigned if/when the api-spec source is fetched properly
    apiCache: {}, // We have to pre-cache the api-spec files, because latter steps (like ejs) can't run asynchronously
    sdkDocsByMethodName: {}, // When loading TOC, match documents to the SdkGen function that should be called for those docs
    specialization: defaultSpecialization,
    unitySubfolder: null
};
global.sdkGeneratorGlobals = sdkGeneratorGlobals;

let specializationContent;

/////////////////////////////////// The main build sequence for this program ///////////////////////////////////
function parseAndLoadApis() {
    // console.log("My args:" + process.argv.join(" "));

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
    console.log("Syntax: node generate.js\n" +
        "\t\t(<targetName>=<targetOutputPath>|-destPath <destFolderPath>)\n" +
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
    var targetList = getTargetsList();
    console.log("\t" + targetList.join(", "));
    process.exit(1);
}

/////////////////////////////////// Major step 1 - Parse and validate command-line inputs ///////////////////////////////////
function parseCommandInputs(args, argsByName: { [key: string]: string; }, errorMessages: string[], buildTarget: IBuildTarget) {
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
    } catch (err) {
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

    if (argsByName.unityDestinationSubfolder)
        sdkGeneratorGlobals.unitySubfolder = argsByName.unityDestinationSubfolder;

    // Output an error if no targets are defined
    if (!buildTarget.destPath)
        errorMessages.push("Build target not defined, nothing to build.");

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
        buildTarget.buildFlags = lowercaseFlagsList(argsByName.flags.split(" "));
}

function extractArgs(args, argsByName: { [key: string]: string; }, buildTarget: IBuildTarget, errorMessages: string[]) {
    var cmdArgs = args.slice(2, args.length); // remove "node.exe generate.js"
    var activeKey = null;
    var specialization;
    for (var i = 0; i < cmdArgs.length; i++) {
        var lcArg = cmdArgs[i].toLowerCase();
        if (cmdArgs[i].indexOf("--") === 0) {
            if (specialization) {
                errorMessages.push("Specialization is already specified: (" + specialization + ") but additional parameter encountered: (" + cmdArgs[i] + ")");
            } else {
                specialization = lcArg.substring(2); // remove the "--", lowercase the value
                argsByName["specialization"] = specialization;
            }
        } else if (cmdArgs[i].indexOf("-") === 0) {
            activeKey = lcArg.substring(1); // remove the "-", lowercase the argsByName-key
            argsByName[activeKey] = "";
        } else if (lcArg.indexOf("=") !== -1) { // any parameter with an "=" is assumed to be a target specification, lowercase the targetName
            var argPair = cmdArgs[i].split("=", 2);
            checkTarget(argPair[0].toLowerCase(), argPair[1], buildTarget, errorMessages);
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
    if (!buildTarget.destPath) {

        console.log("argsByName: " + JSON.stringify(argsByName) + " " + argsByName["destpath"]);

        if (argsByName["destpath"]) {
            checkTarget(argsByName["srcfolder"], argsByName["destpath"], buildTarget, errorMessages);
        } else if (process.env.hasOwnProperty("SdkName")) {
            checkTarget(process.env["SdkSource"], process.env["SdkName"], buildTarget, errorMessages);
        }
    }
}

interface IBuildTarget {
    buildFlags: string[],
    destPath: string,
    srcFolder: string,
    versionKey: string,
    versionString: string,
}
function checkTarget(sdkSrcFolder, sdkDestination, buildTarget: IBuildTarget, errorMessages) {
    var destPath = path.normalize(sdkDestination);
    if (fs.existsSync(destPath) && !fs.lstatSync(destPath).isDirectory()) {
        errorMessages.push("Invalid target output path: " + destPath);
        return;
    }

    buildTarget.destPath = destPath;
    buildTarget.srcFolder = sdkSrcFolder;
    buildTarget.versionKey = sdkSrcFolder;
    buildTarget.versionString = null;
}

function getTargetsList() {
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
function loadAndCacheApis(argsByName, apiCache) {
    // generateSdks is the function that begins the next step

    if (argsByName.apispecpath) {
        loadApisFromLocalFiles(argsByName, apiCache, argsByName.apispecpath, generateSdks);
    } else if (argsByName.apispecgiturl) {
        loadApisFromGitHub(argsByName, apiCache, argsByName.apispecgiturl, generateSdks);
    } else if (argsByName.apispecpfurl) {
        loadApisFromPlayFabServer(argsByName, apiCache, argsByName.apispecpfurl, generateSdks);
    }
}

function getSpecializationTocRef(apiCache) {
    var specializationRefs = apiCache[tocCacheKey].specializations;
    if (specializationRefs) {
        for (var i = 0; i < specializationRefs.length; i++) {
            if (specializationRefs[i].name == sdkGeneratorGlobals.specialization) {
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
    function loadEachFile(filename: string, cacheKey: string, optional: boolean) {
        var fullPath = path.resolve(apiSpecPath, filename);
        console.log("Begin reading File: " + fullPath);
        var fileContents = null;
        try {
            fileContents = require(fullPath);
        } catch (err) {
            console.log(" ***** Failed to Load: " + fullPath);
            if (!optional) throw err;
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

    sdkGeneratorGlobals.apiSrcDescription = "-apiSpecPath " + argsByName.apispecpath;
    catchAndReport(onComplete);
}

function loadApisFromGitHub(argsByName, apiCache, apiSpecGitUrl, onComplete) {
    var finishCountdown = 0;

    function onEachComplete(cacheKey) {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from GitHub");
            sdkGeneratorGlobals.apiSrcDescription = "-apiSpecGitUrl " + argsByName.apiSpecGitUrl;
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
            sdkGeneratorGlobals.apiSrcDescription = "-apiSpecPfUrl " + argsByName.apispecpfurl;
            catchAndReport(onComplete);
        }
    }

    function onTocComplete() {
        // Load specialization TOC
        var specializationTocRef = getSpecializationTocRef(apiCache);
        if (specializationTocRef) {
            finishCountdown += 1;
            downloadFromUrl(defaultApiSpecGitHubUrl, specializationTocRef.path, apiCache, specializationTocCacheKey, onEachComplete, false);
        }

        // Load TOC docs
        var docList = apiCache[tocCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                if (!docList[dIdx].relPath.contains("SdkManualNotes"))
                    downloadFromUrl(apiSpecPfUrl, docList[dIdx].docKey, apiCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
                else
                    downloadFromUrl(defaultApiSpecGitHubUrl, docList[dIdx].relPath, apiCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
                mapSpecMethods(docList[dIdx]);
            }
        }
    }

    // Load TOC
    downloadFromUrl(defaultApiSpecGitHubUrl, tocFilename, apiCache, tocCacheKey, onTocComplete, false);
}

function downloadFromUrl(srcUrl: string, appendUrl: string, apiCache, cacheKey: string, onEachComplete, optional: boolean) {
    srcUrl = srcUrl.endsWith("/") ? srcUrl : srcUrl + "/";
    var fullUrl = srcUrl + appendUrl;
    console.log("Begin reading URL: " + fullUrl);
    var rawResponse = "";
    https.get(fullUrl, (request) => {
        request.setEncoding("utf8");
        request.on("data", (chunk) => { rawResponse += chunk; });
        request.on("end", () => {
            console.log("Finished reading: " + fullUrl);
            try {
                apiCache[cacheKey] = JSON.parse(rawResponse);
            } catch (jsonErr) {
                console.log(" ***** Failed to parse json: " + rawResponse.trim());
                console.log(" ***** Failed to Load: " + fullUrl);
                if (!optional)
                    throw jsonErr;
            }
            onEachComplete(cacheKey);
        });
        request.on("error", (reqErr) => {
            console.log(" ***** Request failed on: " + fullUrl);
            console.log(reqErr);
            if (!optional)
                throw reqErr;
        });
    });
}

/////////////////////////////////// Major step 3 - Generate the indicated ouptut files ///////////////////////////////////
interface IGenConfig {
    branchSpecMap: { [key: string]: string; },
    delSrc: boolean,
    buildFlags: string,
    outputDirs: string[],
    srcFolder: string,
    versionKey: string,
    versionString: string,
}
function generateApis(buildIdentifier, target: IBuildTarget) {
    console.log("Generating PlayFab APIs from specs: " + sdkGeneratorGlobals.apiSrcDescription);

    var genConfig: IGenConfig = null;

    // This is disabled until we more carefully detect and alert on input conflicts
    //var genConfigPath = path.resolve(target.destPath, "genConfig.json");
    //try {
    //    genConfig = require(genConfigPath);
    //    console.log("Loaded genConfig at: " + genConfigPath);
    //} catch (_) {
    //    console.log("Did not find: " + genConfigPath);
    //}

    if (genConfig) {
        if (genConfig.buildFlags) target.buildFlags = genConfig.buildFlags.split(" ");
        if (genConfig.srcFolder) target.srcFolder = genConfig.srcFolder;
        if (genConfig.versionKey) target.versionKey = genConfig.versionKey;
        if (genConfig.versionString) target.versionString = genConfig.versionString;
    }

    if (!target.srcFolder) {
        throw Error("SdkGenerator/target subfolder not defined: " + target.srcFolder);
    }

    var targetsDir = path.resolve(__dirname, "targets");
    var targetSourceDir = path.resolve(targetsDir, target.srcFolder);
    var targetMain = path.resolve(targetSourceDir, "make.js");
    console.log("Making target from: " + targetMain + "\n - to: " + target.destPath);
    var targetMaker = require(targetMain);

    // It would probably be better to pass these into the functions, but I don't want to change all the make___Api parameters for all projects today.
    //   For now, just change the global variables in each with the data loaded from SdkManualNotes.json
    if (target.versionKey && !target.versionString) {
        var apiNotes = getApiJson("SdkManualNotes");
        target.versionString = apiNotes.sdkVersion[target.versionKey];
    }

    console.log("Target: " + JSON.stringify(target));

    sdkGlobals.sdkVersion = target.versionString;
    sdkGlobals.buildIdentifier = buildIdentifier;
    if (sdkGlobals.sdkVersion === null) {
        // The point of this error is to force you to add a line to sdkManualNotes.json, to describe the version and date when this sdk/collection is built
        throw Error("SdkManualNotes does not contain sdkVersion for " + target.srcFolder); 
    }

    for (var funcIdx in sdkGeneratorGlobals.sdkDocsByMethodName) {
        const funcName = sdkGeneratorGlobals.sdkDocsByMethodName[funcIdx].funcName;
        const funcDocNames = sdkGeneratorGlobals.sdkDocsByMethodName[funcIdx].apiDocKeys;
        const jsonDocList = [];
        for (var docIdx = 0; docIdx < funcDocNames.length; docIdx++) {
            var apiDefn = getApiDefinition(funcDocNames[docIdx], target.buildFlags)
            if (apiDefn)
                jsonDocList.push(apiDefn);
        }

        if (targetMaker[funcName]) {
            console.log(" + Generating " + funcName + " to " + target.destPath);
            if (!fs.existsSync(target.destPath))
                mkdirParentsSync(target.destPath);
            targetMaker[funcName](jsonDocList, targetSourceDir, target.destPath);
        }
    }

    console.log("\n\nDONE!\n");
}

function getApiDefinition(cacheKey, buildFlags) {
    var api = getApiJson(cacheKey);
    if (!api)
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
        var callFlagConflicts = GetFlagConflicts(buildFlags, api.calls[cIdx], obsoleteFlaged, nonNullableFlagged)
        if (!callFlagConflicts)
            filteredCalls.push(api.calls[cIdx]);
        else
            console.log("** Skipping Flagged Method: " + api.name + "." + api.calls[cIdx].name + ": " + callFlagConflicts)
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
            console.log("** Skipping Flagged Method: " + api.name + "." + api.datatypes[dIdx].className + ": " + typeFlagConflicts)
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
    if (allInclusiveFlags.length !== 0) // If there's no flags, it is always included
        for (var alIdx = 0; alIdx < allInclusiveFlags.length; alIdx++)
            if (buildFlags.indexOf(allInclusiveFlags[alIdx]) === -1)
                return apiObj.AllInclusiveFlags; // If a required flag is missing, fail out

    // Any Inclusive flags must match at least one if present (Api calls and datatypes)
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

/////////////////////////////////// GLOBAL UTILITIES used by make.js and other target-specific files ///////////////////////////////////

interface String {
    replaceAll(search: string, replacement: string): string;
    endsWith(search: string): boolean;
    contains(search: string): boolean;
    wordWrap(width: number, brk: string, cut: boolean): string;
    padStart(targetLength: number, padString: string): string;
    repeat(targetLength: number): string;
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

/**
 * Word wraps a string to fit a particular width
 * @param width Number, default 120
 * @param brk string, inserted on wrap locations, default newline
 * @param cut boolean, default false, I think it removes everything after the wordwrap, instead of inserting brk
 * @returns {string}
 */
String.prototype.wordWrap = function (width: number, brk: string, cut: boolean): string {
    brk = brk || "\n";
    width = width || 120;
    cut = cut || false;

    var regex = '.{1,' + width + '}(\\s|$)' + (cut ? '|.{' + width + '}|.+$' : '|\\S+?(\\s|$)');
    var regres = this.match(RegExp(regex, 'g'));
    if (regres) {
        var filtered = [];
        for (var i = 0; i < regres.length; i++) {
            if (!regres[i]) continue;
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
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
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
function templatizeTree(locals: { [key: string]: any }, sourcePath: string, destPath: string): void {
    if (!fs.existsSync(sourcePath))
        throw Error("Copy tree source doesn't exist: " + sourcePath);
    if (!fs.lstatSync(sourcePath).isDirectory()) // File
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
        if (fs.lstatSync(file).isDirectory())
            templatizeTree(locals, file, destPath + "/" + filename);
        else
            copyOrTemplatizeFile(locals, file, destPath + "/" + filename);
    }
}
global.templatizeTree = templatizeTree;

function copyOrTemplatizeFile(locals: { [key: string]: any }, sourceFile: string, destFile: string): void {
    checkFileCopy(sourceFile, destFile);
    if (!sourceFile.endsWith(".ejs"))
        return copyFile(sourceFile, destFile);

    var template = getCompiledTemplate(sourceFile);
    writeFile(destFile.substr(0, destFile.length - 4), template(locals));
}

function copyTree(sourcePath: string, destPath: string): void {
    if (!fs.existsSync(sourcePath))
        throw Error("Copy tree source doesn't exist: " + sourcePath);
    if (!fs.lstatSync(sourcePath).isDirectory()) // File
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

function copyFile(sourceFile, destPath): void {
    checkFileCopy(sourceFile, destPath);

    var filename = path.basename(sourceFile);

    if (fs.existsSync(destPath)) {
        if (fs.lstatSync(destPath).isDirectory()) {
            destPath += "/" + filename;
        }
    } else {
        if (destPath[destPath.length - 1] === "/" || destPath[destPath.length - 1] === "\\") {
            mkdirParentsSync(destPath);
            destPath += filename;
        } else {
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

function checkFileCopy(sourceFile: string, destFile: string): void {
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
function getCompiledTemplate(templatePath: string): any {
    if (!this.compiledTemplates)
        this.compiledTemplates = {};
    if (!this.compiledTemplates.hasOwnProperty(templatePath))
        this.compiledTemplates[templatePath] = ejs.compile(readFile(templatePath));
    return this.compiledTemplates[templatePath];
}
global.getCompiledTemplate = getCompiledTemplate;

function doNothing() { }
function catchAndReport(method) {
    try {
        method();
    } catch (error) {
        console.error(error);
        setTimeout(doNothing, 30000);
        // throw(error);
    }
}

// Kick everything off
catchAndReport(parseAndLoadApis);

setTimeout(doNothing, 5000);
