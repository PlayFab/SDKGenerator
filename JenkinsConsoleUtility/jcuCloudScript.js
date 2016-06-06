///////////////////////////////////////////////
// JenkinsConsoleUtility CloudScript functions
///////////////////////////////////////////////

var TEST_TITLE_ID = "6195"; // NOTE: Replace this with your own titleID - DeleteUsers has an additional security check to avoid accidents

handlers.helloWorld = function (args) {
    var message = "Hello " + currentPlayerId + "!";
    log.info(message);
    return { messageValue: message };
}

handlers.easyLogEvent = function (args)
{
    log.info(JSON.stringify(args.logMessage));
}

handlers.TestDataExists = function (args)
{
    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [args.customId]
    });
    return playerData.Data.hasOwnProperty(args.customId);
}

handlers.GetTestData = function (args)
{
    var testResults = null;
    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [args.customId]
    });
    if (playerData.Data.hasOwnProperty(args.customId))
    {
        log.info("Returning Data: " + playerData.Data[args.customId].Value);
        testResults = JSON.parse(playerData.Data[args.customId].Value);
        server.DeleteUsers({
            TitleId: TEST_TITLE_ID,
            PlayFabIds: [currentPlayerId]
        });
    } else {
        log.info("Expected data not found in: " + JSON.stringify(playerData));
    }
    
    return testResults;
}

handlers.SaveTestData = function (args) {
    var data = {};
    data[args.customId] = JSON.stringify(args.testReport);
    log.info("Saving Data: " + JSON.stringify(data));
    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: data
    });
}
