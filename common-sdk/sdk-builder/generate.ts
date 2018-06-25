var ejs = require("ejs");
var fs = require("fs");
var https = require("https");
var path = require("path");

ejs.delimiter = "\n";

interface ITargetOutput {
    name: string,
    dest: string,
}

// Plugin descriptor schema
interface PluginDescriptor {
    id: string;
    dependencies: string[];
    configurationSettingKeys: { key: string; defaultValue: string; }[];
    targets: {
        name: string;
        code: {
            headerInclude: string;
            callCreate: string;
        };
    }[];
}

// SDK configuration schema
interface SdkConfig {
    output: string;
    description: string;
    plugins: SdkConfigPluginItem[];
    targetPlatforms: string[];
    pluginSubtypePath: string; // TODO: this is a temporary solution and needs to be removed when we decide how to deal with plugin subtypes (e.g. PlayFabSDK, PlayFabClientSDK, PlayFabServerSDK). Requires discussion as it will have an impact on dependencies metadata.
}

interface SdkConfigPluginItem {
    id: string;
    configuration: {
        settings: { key: string; value: string; }[];
    };
}

// Struct with global variables used across this app
interface SdkGlobals {
    argsByName: any;
    errorMessages: string[];
    targetOutputPathList: any[];
    buildFlags: string[];
    configDescription: string;
    docCache: { [key: string]: any; };
    config: SdkConfig;
    pluginCache: { [pluginId: string]: PluginDescriptor; }
}

var sdkGeneratorGlobals: SdkGlobals = {
    // Frequently, these are passed by reference to avoid over-use of global variables. Unfortunately, the async nature of loading api files required some global references

    // Internal note: We lowercase the argsByName-keys, targetNames, buildIdentifier, and the flags.  Case is maintained for all other argsByName-values, and targets
    argsByName: {}, // Command line args compiled into KVP's
    errorMessages: [], // String list of errors during parsing and loading steps
    targetOutputPathList: [], // A list of objects that describe sdk targets to build
    buildFlags: [], // The sdkBuildFlags which modify the list of APIs available in this build of the SDK
    configDescription: "INVALID", // Assigned if/when the config is fetched properly
    docCache: {}, // We have to pre-cache files, because latter steps (like ejs) can't run asynchronously
    config: null, // The loaded configuration
    pluginCache: {} // The collection of plugins required for SDK
};

const defaultConfigFilePath = "configuration"; // Relative path to Generate.js
const defaultConfigGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master";
const defaultConfigPlayFabUrl = "https://www.playfabapi.com/apispec";
const pluginDescriptorFilename = "descriptor.json";
const configFilename = "configuration.json";
const configCacheKey = "config";

/////////////////////////////////// The main build sequence for this program ///////////////////////////////////
function main() {
    console.log("My args:" + process.argv.join(" "));
    // Step 1
    parseCommandInputs(process.argv, sdkGeneratorGlobals.argsByName, sdkGeneratorGlobals.errorMessages, sdkGeneratorGlobals.targetOutputPathList);
    reportErrorsAndExit(sdkGeneratorGlobals.errorMessages);

    // Kick off Step 2
    loadAndCacheConfig(sdkGeneratorGlobals.argsByName, sdkGeneratorGlobals.docCache);
}

// Wrapper function for Step 3
function generateSdks() {
    generateModularSdks(sdkGeneratorGlobals.argsByName["buildidentifier"], sdkGeneratorGlobals.targetOutputPathList, sdkGeneratorGlobals.buildFlags, sdkGeneratorGlobals.configDescription, sdkGeneratorGlobals.config);
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
        argsByName.apispecpath = defaultConfigFilePath;
    if (argsByName.apispecgiturl === "")
        argsByName.apispecgiturl = defaultConfigGitHubUrl;
    if (argsByName.apispecpfurl === "")
        argsByName.apispecpfurl = defaultConfigPlayFabUrl;

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

    // Common-SDK-part-begin
    // If script argument -plugins was specified then 
    // plugin generation must be performed instead of the classic SDK generation
    if (argsByName.plugins == null)
        argsByName.plugins = false;
    else
        argsByName.plugins = true;

    if (argsByName.plugins) {
        if (targetOutputPathList.length === 0)
            errorMessages.push("SDK source is not defined, plugins can't be generated");

        var sdkSource = targetOutputPathList[0].name;

        // Determine important paths
        var commonSdkDir = path.resolve("common-sdk");
        var pluginGenDir = path.resolve(commonSdkDir, "plugin-generator");
        var targetSourceRootDir = path.resolve(pluginGenDir, "targets/" + sdkSource);

        // Get a list of plugins and set target outputs (one for each plugin)
        // (in current implementation simply enumerate plugin subdirectories in the "SDK source" directory for plugins)
        targetOutputPathList.length = 0;
        var files = fs.readdirSync(targetSourceRootDir);
        for (var i in files) {
            if (!files.hasOwnProperty(i))
                continue;
            var dirName = files[i];
            var dirPath = targetSourceRootDir + '/' + dirName;
            if (fs.statSync(dirPath).isDirectory()) {

                // Set target output for a plugin
                var dest = "common-sdk/plugins/" + dirName + '/' + sdkSource;
                //checkPluginTarget(sdkSource, dirName, dest, targetOutputPathList, errorMessages);
            }
        }
    }
    // Common-SDK-part-end
}

function extractArgs(args, argsByName, targetOutputPathList, errorMessages) {
    var cmdArgs = args.slice(2, args.length); // remove "node.exe generate.js"
    var activeKey = null;
    for (var i = 0; i < cmdArgs.length; i++) {
        var lcArg = cmdArgs[i].toLowerCase();
        if (cmdArgs[i].indexOf("-") === 0) {
            activeKey = lcArg.substring(1); // remove the "-", lowercase the argsByName-key
            argsByName[activeKey] = "";
        } else if ((lcArg === "c:\\depot\\api_specs" || lcArg === "..\\api_specs") && activeKey === null && !argsByName.hasOwnProperty("apispecpath")) { // Special case to handle old API-Spec path as fixed 3rd parameter - DEPRECATED
            argsByName["apispecpath"] = cmdArgs[i];
        } else if (activeKey === null) {
        } else {
            var temp = argsByName[activeKey];
            if (temp.length > 0)
                argsByName[activeKey] = argsByName[activeKey] + " " + cmdArgs[i];
            else
                argsByName[activeKey] = cmdArgs[i];
        }
    }
}

function getTargetsList() {
    var targetList = [];

    var targetsDir = path.resolve(__dirname, "targets");
    // Common-SDK-part-begin
    if (sdkGeneratorGlobals.argsByName.plugins) {
        targetsDir = path.resolve(__dirname, "common-sdk/plugin-generator/targets");
    }
    // Common-SDK-part-end

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

/////////////////////////////////// Major step 2 - Load and cache configuration ///////////////////////////////////
function loadAndCacheConfig(argsByName, docCache) {
    // generateSdks is the function that begins the next step

    if (argsByName.apispecpath) {
        loadConfigFromLocalFiles(argsByName, docCache, argsByName.apispecpath, generateSdks);
    } else if (argsByName.apispecgiturl) {
        loadConfigFromGitHub(argsByName, docCache, argsByName.apispecgiturl, generateSdks);
    } else if (argsByName.apispecpfurl) {
        loadConfigFromPlayFabServer(argsByName, docCache, argsByName.apispecpfurl, generateSdks);
    }
}

function loadConfigFromLocalFiles(argsByName, docCache, apiSpecPath, onComplete) {
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
            docCache[cacheKey] = fileContents;
        }
        console.log("Finished reading: " + fullPath);
    }

    loadEachFile(configFilename, configCacheKey, false);
    sdkGeneratorGlobals.config = docCache[configCacheKey];

    /*
    var docList = docCache[configCacheKey].documents;
    for (var dIdx = 0; dIdx < docList.length; dIdx++) {
        var genMethods = docList[dIdx].sdkGenMakeMethods;
        if (genMethods) {
            loadEachFile(docList[dIdx].relPath, docList[dIdx].docKey, docList[dIdx].isOptional);
            mapSpecMethods(docList[dIdx]);
        }
    }*/

    sdkGeneratorGlobals.configDescription = sdkGeneratorGlobals.config.description;
    onComplete();
}

function loadConfigFromGitHub(argsByName, docCache, apiSpecGitUrl, onComplete) {
    var finishCountdown = 0;

    function onEachComplete(cacheKey) {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from GitHub");
            sdkGeneratorGlobals.configDescription = argsByName.apiSpecGitUrl;
            onComplete();
        }
    }

    function onTocComplete() {
        var docList = docCache[configCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                downloadFromUrl(apiSpecGitUrl, docList[dIdx].relPath, docCache, docList[dIdx].docKey, onEachComplete, docList[dIdx].isOptional);
            }
        }
    }

    downloadFromUrl(apiSpecGitUrl, configFilename, docCache, configCacheKey, onTocComplete, false);
}

function loadConfigFromPlayFabServer(argsByName, docCache, apiSpecPfUrl, onComplete) {
    var finishCountdown = 0;

    function onEachComplete() {
        finishCountdown -= 1;
        if (finishCountdown === 0) {
            console.log("Finished loading files from PlayFab Server");
            sdkGeneratorGlobals.configDescription = argsByName.apispecpfurl;
            onComplete();
        }
    }

    function onTocComplete() {
        var docList = docCache[configCacheKey].documents;
        for (var dIdx = 0; dIdx < docList.length; dIdx++) {
            if (docList[dIdx].sdkGenMakeMethods) {
                finishCountdown += 1;
                if (!docList[dIdx].relPath.contains("SdkManualNotes"))
                    downloadFromUrl(apiSpecPfUrl, docList[dIdx].docKey, docCache, docList[dIdx].docKey, onEachComplete, false);
                else
                    downloadFromUrl(defaultConfigGitHubUrl, docList[dIdx].relPath, docCache, docList[dIdx].docKey, onEachComplete, false);
            }
        }
    }

    downloadFromUrl(defaultConfigGitHubUrl, configFilename, docCache, configCacheKey, onTocComplete, false);
}

function downloadFromUrl(srcUrl: string, appendUrl: string, docCache, cacheKey: string, onEachComplete, optional: boolean) {
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
                docCache[cacheKey] = JSON.parse(rawResponse);
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

function prepareTargetOutputs(targetOutputPathList, config: SdkConfig) {
    if (config) {
        targetOutputPathList.length = 0;
        for (var i = 0; i < config.targetPlatforms.length; i++) {
            var targetOutput: ITargetOutput = {
                name: config.targetPlatforms[i],
                dest: path.normalize(config.output + "/" + config.targetPlatforms[i])
            };

            mkdirParentsSync(targetOutput.dest);
            targetOutputPathList.push(targetOutput);
        }
    }
}

/////////////////////////////////// Major step 3 - Generate the files for modular SDKs ///////////////////////////////////
function generateModularSdks(buildIdentifier, targetOutputPathList, buildFlags, configDescription, config: SdkConfig) {
    console.log("Generating PlayFab modular SDKs from configuration: " + configDescription);

    // Prepare the SDK destination (fills targetOutputPathList)
    prepareTargetOutputs(targetOutputPathList, config);

    // Determine and read all required plugins
    var pluginsPath = "../plugins";
    var pluginDir: string;
    for (var i = 0; i < config.plugins.length; i++) {
        readPlugin(config.plugins[i].id, pluginsPath);
    }

    var sdkBuilderTargetsDir = path.resolve(__dirname, "targets");

    // Iterate through each target platform specified in SDK configuration
    for (var targIdx = 0; targIdx < targetOutputPathList.length; targIdx++) {
        var target = targetOutputPathList[targIdx];

        // Copy all required plugins
        for (var pluginId in sdkGeneratorGlobals.pluginCache) {
            var pluginContentSourceDir = path.resolve(pluginsPath, pluginId + "/" + target.name + "/" + config.pluginSubtypePath + "/source");
            var pluginContentTargetDir = path.resolve(target.dest, "source/plugins/" + pluginId);
            copyTree(pluginContentSourceDir, pluginContentTargetDir);
        }

        // Copy the common library
        var commonLibrarySourceDir = path.resolve("../common-client-lib/source");
        var commonLibraryTargetDir = path.resolve(target.dest, "source/common-client-lib");
        copyTree(commonLibrarySourceDir, commonLibraryTargetDir);

        // Other SDK build operations (generating from templates, etc)
        var targetSourceDir = path.resolve(sdkBuilderTargetsDir, target.name);
        var targetMain = path.resolve(targetSourceDir, "make.js");
        console.log("Making target from: " + targetMain + "\n - to: " + target.dest);
        var targetMaker = require(targetMain);

        //var apiNotes = getApiJson("SdkManualNotes");
        targetMaker.sdkVersion = "1.0.0.0"; //apiNotes.sdkVersion[target.name];
        targetMaker.buildIdentifier = buildIdentifier;
        if (targetMaker.sdkVersion === null) {
            throw "SdkManualNotes does not contain sdkVersion for " +
            target.name; // The point of this error is to force you to add a line to sdkManualNotes.json, to describe the version and date when this sdk/collection is built
        }

        if (targetMaker["main"]) {
            console.log(" + Generating SDK to " + target.dest);
            if (!fs.existsSync(target.dest))
                mkdirParentsSync(target.dest);

            // Generate and copy Plugin Manager
            // Generate project files
            // Generate settings file
            // Generate nuget file
            targetMaker["main"](targetSourceDir, target.dest, target.name, sdkGeneratorGlobals.pluginCache, config);
        }
    }

    // Done
    console.log("\n\nDONE!\n");
}

function readPlugin(id: string, pluginsPath: string) {
    // If plugin's descriptor is already in the cache then return immediately (prevents loops)
    if (sdkGeneratorGlobals.pluginCache[id])
        return;

    // Read plugin's descriptor
    var pluginDir = path.resolve(pluginsPath, id);
    if (fs.existsSync(pluginDir) && fs.lstatSync(pluginDir).isDirectory()) {
        var pluginDescriptorFile = path.resolve(pluginDir, pluginDescriptorFilename);
        if (fs.existsSync(pluginDescriptorFile) && !fs.lstatSync(pluginDescriptorFile).isDirectory()) {
            console.log("Begin reading File: " + pluginDescriptorFile);
            var fileContents: PluginDescriptor = null;
            try {
                fileContents = require(pluginDescriptorFile);
            } catch (err) {
                console.log(" ***** Failed to Load: " + pluginDescriptorFile);
                throw err;
            }

            if (fileContents) {
                // Put plugin's descriptor in cache
                sdkGeneratorGlobals.pluginCache[id] = fileContents;

                // Iterate through possible plugin's hard dependendecies and read them too
                if (fileContents.dependencies) {
                    for (var i = 0; i < fileContents.dependencies.length; i++) {
                        readPlugin(fileContents.dependencies[i], pluginsPath);
                    }
                }
            }

            console.log("Finished reading: " + pluginDescriptorFile);
        }
        else
            throw "ERROR: required plugin's descriptor doesn't exist: " + pluginDescriptorFile;
    }
    else
        throw "ERROR: required plugin's directory doesn't exist: " + pluginDir;
}

function getApiDefinition(cacheKey, buildFlags) {
    var api;// = getApiJson(cacheKey);
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
/*
function getApiJson(cacheKey: string) {
    if (sdkGeneratorGlobals.docCache.hasOwnProperty(cacheKey))
        return sdkGeneratorGlobals.docCache[cacheKey];
    return null;
}
global.getApiJson = getApiJson;*/

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
main();
