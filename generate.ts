var ejs = require("ejs");
var fs = require("fs");
var https = require("https");
var path = require("path");

ejs.delimiter = "\n";

interface SdkDoc {
    funcName: string;
    apiDocKeys: string[];
}

interface SdkGlobals {
    argsByName: any;
    errorMessages: string[];
    targetOutputPathList: any[];
    buildFlags: string[];
    apiSrcDescription: string;
    apiCache: { [key: string]: any; }
    sdkDocsByMethodName: { [key: string]: SdkDoc; }
}

var sdkGeneratorGlobals: SdkGlobals = {
    // Frequently, these are passed by reference to avoid over-use of global variables. Unfortunately, the async nature of loading api files required some global references

    // Internal note: We lowercase the argsByName-keys, targetNames, buildIdentifier, and the flags.  Case is maintained for all other argsByName-values, and targets
    argsByName: {}, // Command line args compiled into KVP's
    errorMessages: [], // String list of errors during parsing and loading steps
    targetOutputPathList: [], // A list of objects that describe sdk targets to build
    buildFlags: [], // The sdkBuildFlags which modify the list of APIs available in this build of the SDK
    apiSrcDescription: "INVALID", // Assigned if/when the api-spec source is fetched properly
    apiCache: {}, // We have to pre-cache the api-spec files, because latter steps (like ejs) can't run asynchronously
    sdkDocsByMethodName: {} // When loading TOC, match documents to the SdkGen function that should be called for those docs
};

const defaultApiSpecFilePath = "../API_Specs"; // Relative path to Generate.js
const defaultApiSpecGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master";
const defaultApiSpecPlayFabUrl = "https://www.playfabapi.com/apispec";
const tocFilename = "TOC.json";
const tocCacheKey = "TOC";

/////////////////////////////////// The main build sequence for this program ///////////////////////////////////
function parseAndLoadApis() {
    console.log("My args:" + process.argv.join(" "));
    // Step 1
    parseCommandInputs(process.argv, sdkGeneratorGlobals.argsByName, sdkGeneratorGlobals.errorMessages, sdkGeneratorGlobals.targetOutputPathList);
    reportErrorsAndExit(sdkGeneratorGlobals.errorMessages);

    // Kick off Step 2
    loadAndCacheApis(sdkGeneratorGlobals.argsByName, sdkGeneratorGlobals.apiCache);
}

// Wrapper function for Step 3
function generateSdks() {
    generateApis(sdkGeneratorGlobals.argsByName["buildidentifier"], sdkGeneratorGlobals.targetOutputPathList, sdkGeneratorGlobals.buildFlags, sdkGeneratorGlobals.apiSrcDescription);
}

function reportErrorsAndExit(errorMessages) {
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
    var targetList = getTargetsList();
    console.log("\t" + targetList.join(", "));
    process.exit(1);
}

/////////////////////////////////// Major step 1 - Parse and validate command-line inputs ///////////////////////////////////
function parseCommandInputs(args, argsByName, errorMessages, targetOutputPathList) {
    // Parse the command line arguments into key-value-pairs
    extractArgs(args, argsByName, targetOutputPathList, errorMessages);

    // Apply defaults 
    if (!argsByName.hasOwnProperty("apispecpath") && !argsByName.hasOwnProperty("apispecgiturl") && !argsByName.hasOwnProperty("apispecpfurl"))
        argsByName.apispecgiturl = ""; // If nothing is defined, default to GitHub
    // A source key set, with no value means use the default for that input format
    if (argsByName.apispecpath === "")
        argsByName.apispecpath = defaultApiSpecFilePath;
    if (argsByName.apispecgiturl === "")
        argsByName.apispecgiturl = defaultApiSpecGitHubUrl;
    if (argsByName.apispecpfurl === "")
        argsByName.apispecpfurl = defaultApiSpecPlayFabUrl;

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
        sdkGeneratorGlobals.buildFlags = lowercaseFlagsList(argsByName.flags.split(" "));
}

function extractArgs(args, argsByName, targetOutputPathList, errorMessages) {
    var cmdArgs = args.slice(2, args.length); // remove "node.exe generate.js"
    var activeKey = null;
    for (var i = 0; i < cmdArgs.length; i++) {
        var lcArg = cmdArgs[i].toLowerCase();
        if (cmdArgs[i].indexOf("-") === 0) {
            activeKey = lcArg.substring(1); // remove the "-", lowercase the argsByName-key
            argsByName[activeKey] = "";
        } else if (lcArg.indexOf("=") !== -1) { // any parameter with an "=" is assumed to be a target specification, lowercase the targetName
            var argPair = cmdArgs[i].split("=", 2);
            checkTarget(argPair[0].toLowerCase(), argPair[1], targetOutputPathList, errorMessages);
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
        checkTarget(process.env.hasOwnProperty("SdkSource"), process.env.hasOwnProperty("SdkName"), targetOutputPathList, errorMessages);
    }
}

interface ITargetOutput {
    name: string,
    dest: string,
}
function checkTarget(sdkSource, sdkDestination, targetOutputPathList, errorMessages) {
    var targetOutput: ITargetOutput = {
        name: sdkSource,
        dest: path.normalize(sdkDestination)
    };
    if (fs.existsSync(targetOutput.dest) && !fs.lstatSync(targetOutput.dest).isDirectory())
        errorMessages.push("Invalid target output path: " + targetOutput.dest);
    else
        targetOutputPathList.push(targetOutput);
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

    loadEachFile(tocFilename, tocCacheKey, false);
    var docList = apiCache[tocCacheKey].documents;
    for (var dIdx = 0; dIdx < docList.length; dIdx++) {
        var genMethods = docList[dIdx].sdkGenMakeMethods;
        if (genMethods) {
            loadEachFile(docList[dIdx].relPath, docList[dIdx].docKey, docList[dIdx].isOptional);
            mapSpecMethods(docList[dIdx]);
        }
    }

    sdkGeneratorGlobals.apiSrcDescription = argsByName.apispecpath;
    onComplete();
}

function loadApisFromGitHub(argsByName, apiCache, apiSpecGitUrl, onComplete) {
    var finishCountdown = 0;

    function onEachComplete(cacheKey) {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from GitHub");
            sdkGeneratorGlobals.apiSrcDescription = argsByName.apiSpecGitUrl;
            onComplete();
        }
    }

    function onTocComplete() {
        var docList = apiCache[tocCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                downloadFromUrl(apiSpecGitUrl, docList[dIdx].relPath, apiCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
                mapSpecMethods(docList[dIdx]);
            }
        }
    }

    downloadFromUrl(apiSpecGitUrl, tocFilename, apiCache, tocCacheKey, onTocComplete, false);
}

function loadApisFromPlayFabServer(argsByName, apiCache, apiSpecPfUrl, onComplete) {
    var finishCountdown = 0;

    function onEachComplete() {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from PlayFab Server");
            sdkGeneratorGlobals.apiSrcDescription = argsByName.apispecpfurl;
            onComplete();
        }
    }

    function onTocComplete() {
        var docList = apiCache[tocCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                if (!docList[dIdx].relPath.contains("SdkManualNotes"))
                    downloadFromUrl(apiSpecPfUrl, docList[dIdx].docKey, apiCache, docList[dIdx].docKey, onEachComplete, false);
                else
                    downloadFromUrl(defaultApiSpecGitHubUrl, basepath(docList[dIdx].relPath), apiCache, docList[dIdx].docKey, onEachComplete, false);
                mapSpecMethods(docList[dIdx]);
            }
        }
    }

    downloadFromUrl(defaultApiSpecGitHubUrl, tocFilename, apiCache, tocCacheKey, onTocComplete, false);
}

function basepath(path: string) : string {
    var split = path.split("(/|\\)");
    return split[split.length - 1];
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
function generateApis(buildIdentifier, targetOutputPathList, buildFlags, apiSrcDescription) {
    console.log("Generating PlayFab APIs from specs: " + apiSrcDescription);

    var targetsDir = path.resolve(__dirname, "targets");

    for (var targIdx = 0; targIdx < targetOutputPathList.length; targIdx++) {
        var target = targetOutputPathList[targIdx];

        var targetSourceDir = path.resolve(targetsDir, target.name);
        var targetMain = path.resolve(targetSourceDir, "make.js");
        console.log("Making target from: " + targetMain + "\n - to: " + target.dest);
        var targetMaker = require(targetMain);

        // It would probably be better to pass these into the functions, but I don't want to change all the make___Api parameters for all projects today.
        //   For now, just change the global variables in each with the data loaded from SdkManualNotes.json
        var apiNotes = getApiJson("SdkManualNotes");
        targetMaker.sdkVersion = apiNotes.sdkVersion[target.name];
        targetMaker.buildIdentifier = buildIdentifier;
        if (targetMaker.sdkVersion === null) {
            throw "SdkManualNotes does not contain sdkVersion for " +
            target.name; // The point of this error is to force you to add a line to sdkManualNotes.json, to describe the version and date when this sdk/collection is built
        }

        for (var funcIdx in sdkGeneratorGlobals.sdkDocsByMethodName) {
            const funcName = sdkGeneratorGlobals.sdkDocsByMethodName[funcIdx].funcName;
            const funcDocNames = sdkGeneratorGlobals.sdkDocsByMethodName[funcIdx].apiDocKeys;
            const jsonDocList = [];
            for (var docIdx = 0; docIdx < funcDocNames.length; docIdx++)
                jsonDocList.push(getApiDefinition(funcDocNames[docIdx], buildFlags));

            if (targetMaker[funcName]) {
                console.log(" + Generating " + funcName + " to " + target.dest);
                if (!fs.existsSync(target.dest))
                    mkdirParentsSync(target.dest);
                targetMaker[funcName](jsonDocList, targetSourceDir, target.dest);
            }
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

    if (!isVisibleWithFlags(buildFlags, api, obsoleteFlaged, nonNullableFlagged)) {
        console.log("** Skipping Flagged API: " + api.name);
        return null;
    }

    // Filter calls out of the API before returning it
    var filteredCalls = [];
    for (var cIdx = 0; cIdx < api.calls.length; cIdx++)
        if (isVisibleWithFlags(buildFlags, api.calls[cIdx], obsoleteFlaged, nonNullableFlagged))
            filteredCalls.push(api.calls[cIdx]);
    api.calls = filteredCalls;

    // Filter datatypes out of the API before returning it
    var filteredTypes = {};
    for (var dIdx in api.datatypes) {
        if (isVisibleWithFlags(buildFlags, api.datatypes[dIdx], obsoleteFlaged, nonNullableFlagged)) {
            var eachType = api.datatypes[dIdx];
            var filteredProperties = [];
            if (eachType.properties) {
                for (var pIdx = 0; pIdx < eachType.properties.length; pIdx++)
                    if (isVisibleWithFlags(buildFlags, eachType.properties[pIdx], obsoleteFlaged, nonNullableFlagged))
                        filteredProperties.push(eachType.properties[pIdx]);
                eachType.properties = filteredProperties;
            }
            filteredTypes[api.datatypes[dIdx].className] = eachType;
        }
    }
    api.datatypes = filteredTypes;
    return api;
}

function isVisibleWithFlags(buildFlags, apiObj, obsoleteFlaged, nonNullableFlagged) {
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
        exclusiveFlags = lowercaseFlagsList(apiObj.ExclusiveFlags);
    for (var bIdx = 0; bIdx < buildFlags.length; bIdx++)
        if (exclusiveFlags.indexOf(buildFlags[bIdx]) !== -1)
            return false;

    // All Inclusive flags must match if present (Api calls only)
    var allInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AllInclusiveFlags"))
        allInclusiveFlags = lowercaseFlagsList(apiObj.AllInclusiveFlags);
    if (allInclusiveFlags.length !== 0) // If there's no flags, it is always included
        for (var alIdx = 0; alIdx < allInclusiveFlags.length; alIdx++)
            if (buildFlags.indexOf(allInclusiveFlags[alIdx]) === -1)
                return false; // If a required flag is missing, fail out

    // Any Inclusive flags must match at least one if present (Api calls and datatypes)
    var anyInclusiveFlags = [];
    if (apiObj.hasOwnProperty("AnyInclusiveFlags"))
        anyInclusiveFlags = lowercaseFlagsList(apiObj.AnyInclusiveFlags);
    if (anyInclusiveFlags.length === 0)
        return true; // If there's no flags, it is always included
    for (var anIdx = 0; anIdx < anyInclusiveFlags.length; anIdx++)
        if (buildFlags.indexOf(anyInclusiveFlags[anIdx]) !== -1)
            return true; // Otherwise at least one flag must be present
    return false;
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
        throw "Copy tree source doesn't exist: " + sourcePath;
    if (!fs.lstatSync(sourcePath).isDirectory()) // File
        return copyOrTemplatizeFile(locals, sourcePath, destPath);

    // Directory
    if (!fs.existsSync(destPath))
        mkdirParentsSync(destPath);
    else if (!fs.lstatSync(destPath).isDirectory())
        throw "Can't copy a directory onto a file: " + sourcePath + " " + destPath;

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
        throw "Copy tree source doesn't exist: " + sourcePath;
    if (!fs.lstatSync(sourcePath).isDirectory()) // File
        return copyFile(sourcePath, destPath);

    // Directory
    if (!fs.existsSync(destPath))
        mkdirParentsSync(destPath);
    else if (!fs.lstatSync(destPath).isDirectory())
        throw "Can't copy a directory onto a file: " + sourcePath + " " + destPath;

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
        throw "ERROR: Invalid copy file parameters: " + sourceFile + " " + destFile;
    if (!fs.existsSync(sourceFile))
        throw "ERROR: copyFile source doesn't exist: " + sourceFile;
    if (fs.lstatSync(sourceFile).isDirectory())
        throw "ERROR: copyFile source is a directory: " + sourceFile;
}

// Returns one of: Null, "Proposed", "Deprecated", "Obsolete"
function getDeprecationStatus(apiObj) {
    var deprecation = apiObj.hasOwnProperty("deprecation");
    if (!deprecation)
        return null;

    var deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var obsoleteTime = new Date(apiObj.deprecation.ObsoleteAfter);
    var now = new Date();
    if (now > obsoleteTime)
        return "Obsolete";
    if (now > deprecationTime)
        return "Deprecated";
    return "Proposed";
}
global.getDeprecationStatus = getDeprecationStatus;

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

// Fetch the object parsed from an api-file, from the cache (can't load synchronously from URL-options, so we have to pre-cache them)
function getApiJson(cacheKey: string) {
    if (sdkGeneratorGlobals.apiCache.hasOwnProperty(cacheKey))
        return sdkGeneratorGlobals.apiCache[cacheKey];
    return null;
}
global.getApiJson = getApiJson;

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

/**
 * Generate the summary of an API element in a consistent way
 * TODO: Each usage of this function has a NEARLY copy-paste block of lines, joining it with language specfic comment-tags.
 *       We should merge those into this function
 * */
function generateApiSummaryLines(apiElement: any, summaryParam: string, extraLines: Array<string>, linkToDocs: boolean, deprecationLabel: string): Array<string> {
    var fullSummary;
    if (!apiElement.hasOwnProperty(summaryParam))
        fullSummary = [""];
    else if (!Array.isArray(apiElement[summaryParam]))
        fullSummary = [apiElement[summaryParam]];
    else
        fullSummary = apiElement[summaryParam];

    var lines;
    var joinedSummary = fullSummary.join(" ");
    var wrappedSummary = joinedSummary.wordWrap();
    if (wrappedSummary && wrappedSummary.length > 0)
        lines = wrappedSummary.split("\n");
    else
        lines = [];

    // Add extra documentation lines about deprecation
    if (deprecationLabel && apiElement.hasOwnProperty("deprecation")) {
        if (apiElement.deprecation.ReplacedBy != null)
            lines.push(deprecationLabel + " Please use " + apiElement.deprecation.ReplacedBy + " instead.");
        else
            lines.push(deprecationLabel + " Do not use");
    }

    // Add extra documentation lines linking to PlayFab documentation
    if (linkToDocs && apiElement.hasOwnProperty("url")) {
        var apiName = apiElement.url.split("/")[1];
        lines.push("API Method Documentation: https://api.playfab.com/Documentation/" + apiName + "/method/" + apiElement.name);
        if (apiElement.hasOwnProperty("request"))
            lines.push("Request Documentation: https://api.playfab.com/Documentation/" + apiName + "/datatype/PlayFab." + apiName + ".Models/PlayFab." + apiName + ".Models." + apiElement.request);
        if (apiElement.hasOwnProperty("result"))
            lines.push("Result Documentation: https://api.playfab.com/Documentation/" + apiName + "/datatype/PlayFab." + apiName + ".Models/PlayFab." + apiName + ".Models." + apiElement.result);
    }

    // Add explicit extra lines
    if (extraLines && Array.isArray(extraLines))
        for (var i = 0; i < extraLines.length; i++)
            lines.push(extraLines[i]);
    else if (extraLines && extraLines.length > 0)
        lines.push(extraLines);

    return lines;
}
global.generateApiSummaryLines = generateApiSummaryLines;

// Kick everything off
parseAndLoadApis();
