///////////////////////////////////////////////
// JenkinsConsoleUtility CloudScript functions
///////////////////////////////////////////////

var TEST_TITLE_ID: string = "6195"; // NOTE: Replace this with your own titleID - DeleteUsers has an additional security check to avoid accidents
var TEST_DATA_KEY: string = "TEST_DATA_KEY"; // Used to reuse args.customId, but it was kindof a pain, and made things fragile

handlers.helloWorld = function (args: IHelloWorldRequest, context): IHelloWorldResult {
    var message: string = "Hello " + currentPlayerId + "!";
    log.info(message);
    var inputValue: any = null;
    if (args && args.hasOwnProperty("inputValue"))
        inputValue = args.inputValue;
    log.debug("helloWorld:", { input: inputValue });
    return { messageValue: message };
};
interface IHelloWorldRequest {
    inputValue?: any
}
interface IHelloWorldResult {
    messageValue: string
}

handlers.throwError = function (args: void): void {
    var testObject: any = undefined;
    var failureObj: any = testObject.doesnotexist.doesnotexist;
    return failureObj; // Can't get to here
}

handlers.easyLogEvent = function (args: IEasyLogEvent): void {
    log.info(JSON.stringify(args.logMessage));
};
interface IEasyLogEvent {
    logMessage: string
}

///////////////////////////////////////////////
// JenkinsConsoleUtility CloudScript functions
///////////////////////////////////////////////

handlers.TestDataExists = function (args: void): boolean {
    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [TEST_DATA_KEY]
    });
    return playerData.Data.hasOwnProperty(TEST_DATA_KEY);
};

handlers.GetTestData = function (args: void): ITestReport {
    var testResults: ITestReport = null;
    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [TEST_DATA_KEY]
    });
    if (playerData.Data.hasOwnProperty(TEST_DATA_KEY)) {
        log.info("Returning Data: " + playerData.Data[TEST_DATA_KEY].Value);
        testResults = JSON.parse(playerData.Data[TEST_DATA_KEY].Value);
        var data: { [key: string]: string } = {};
        data[TEST_DATA_KEY] = null;
        server.UpdateUserInternalData({
            PlayFabId: currentPlayerId,
            Data: data
        });
    } else {
        log.info("Expected data not found in: " + JSON.stringify(playerData));
    }

    return testResults;
};

handlers.SaveTestData = function (args: ITestReportPackage): void {
    var data: { [key: string]: string } = {};
    data[TEST_DATA_KEY] = JSON.stringify(args.testReport);
    log.info("Saving Data (" + currentPlayerId + "): " + JSON.stringify(data));
    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: data
    });
}
interface ITestReportPackage {
    testReport: ITestReport
}
interface ITestReport {
    // Actually very big/complicated, but not inspected at all in this code.
}
