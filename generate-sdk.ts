// This script includes only logic specific to generation of whole PlayFab SDKs (classic process)

interface SdkGlobals {
    buildIdentifier: string;
    sdkVersion: string;
    verticalName: string;
}

var sdkGlobals: SdkGlobals = {
    buildIdentifier: null,
    sdkVersion: null,
    verticalName: null,
    buildFlags: null
}
global.sdkGlobals = sdkGlobals;

// Fetch the object parsed from an api-file, from the cache (can't load synchronously from URL-options, so we have to pre-cache them)
function getApiJson(cacheKey: string) {
    if (sdkGeneratorGlobals.apiCache.hasOwnProperty(cacheKey))
        return sdkGeneratorGlobals.apiCache[cacheKey];
    return null;
}
global.getApiJson = getApiJson;

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

/*
 * Generate the summary of an API element in a consistent way
 * TODO: Each usage of this function has a NEARLY copy-paste block of lines, joining it with language specfic comment-tags.
 *       We should merge those into this function
 */
function generateApiSummaryLines(apiElement: any, summaryParam: string, extraLines: Array<string>, linkToDocs: boolean, deprecationLabel: string): string[] {
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
        var apiCategory = apiElement.subgroup.toLowerCase().replaceAll(" ","-");
        var fullApiUrl= "https://docs.microsoft.com/rest/api/playfab/" + apiName.toLowerCase() + "/" + apiCategory + "/" + apiElement.name.toLowerCase();
        lines.push("API Method Documentation: " + fullApiUrl);
        if (apiElement.hasOwnProperty("request"))
            lines.push("Request Documentation: " + fullApiUrl + "#" + apiElement.request.toLowerCase());
        if (apiElement.hasOwnProperty("result"))
            lines.push("Response Documentation: " + fullApiUrl + "#" + apiElement.result.toLowerCase());
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


/*
 * Get all of the auth mechanisms across all of the methods in all of the API's
 */
function getAuthMechanisms(apis: any[]): string[] {
    var output: string[] = [];
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];
        for (var c = 0; c < api.calls.length; c++) {
            var call = api.calls[c];
            output.push(call.auth);
        }
    }
    return output;
}
global.getAuthMechanisms = getAuthMechanisms;
