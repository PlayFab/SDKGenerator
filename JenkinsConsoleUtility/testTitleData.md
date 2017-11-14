# testTitleData.json

testTitleData.json is a file that is required by all of the example-test projects in most of the PlayFab sdks

### PlayFab Title Requirements

* Your title must have this title setting enabled:
  * X Allow client to post player statistics
* Your title must have an existing account which matches the email address in your testTitleData.json (described below)
  * The password should be whatever you want, we explicitly test failure to log in with a bad password
* Unit testing titles should be clean/unused titles with no expectations
  * A legacy test exists in some SDKs where a character may be added to an account if the character doesn't exist
  * Specific user data, Entity Objects, and other features may be added to the test player that doesn't match existing title expectations
* One test relies on an advertising plugin being enabled for your title, which is generally not typical. This test will always fail for your test titles, and you can ignore it, or disable it
* The following Cloud Script function must exist in your title:

```JS
handlers.helloWorld = function (args, context) {
    var message = "Hello " + currentPlayerId + "!";
    log.info(message);
    var inputValue = null;
    if (args && args.hasOwnProperty("inputValue"))
        inputValue = args.inputValue;
    log.debug("helloWorld:", { input: inputValue });
    return { messageValue: message };
}

handlers.throwError = function (args) {
	var testObject;
    var failureObj = testObj.doesnotexist.doesnotexist;
	return failureObj; // Can't get to here
}
```

### Each example project serves two main purposes in each SDK:

* Demonstrate to a developer using PlayFab, how to make successful API calls
  * In particular, we demonstrate specific areas of maximum first-time-user benefit, like logging in, Player data and statistics
  * We also demonstrate Cloud Script, which is one of our most powerful features, but can also be somewhat difficult to use properly
* We also use this same code internally to determine if the SDK is actually working properly
  * This is our internal testing process, made transparent to all of our users, and in fact, usable by their own test-titles

This last portion, "running our tests on your own title" comes with a few requirements

* You must specify a testTitleData.json file which tells our tests which title to use
  * For most SDKs, the best way to do this is to set an environment variable called PF_TEST_TITLE_DATA_JSON={the full file path to your testTitleData.json file}

The format of the testTitleData.json file is as follows:

```json 
{
	"titleId": "<Found in PlayFab Game Manager>",
	"developerSecretKey": "<Found in PlayFab Game Manager>",
	"userEmail": "<your@email.com>",
	"characterName": "<CharName>"
}
```

Please note characterName is deprecated, and has already been removed from most of the test-examples in our SDKs.  For those few that remain, this can be any valid character name (Those test suites will usually create the character).

Our own testTitleData.json contains the secret key for title 6195, and thus we do not publish this file.  You should create your own file using the format above, as we cannot provide ours.

Philosophy
====

We feel that by showing you our own testing files, as examples of how to use our SDK, we are guaranteeing a few things:

* The example code in those files always works
  * Those tests must pass on our own automated testing server in order to be published, and therefore, it is a guaranteed working example of how to make those calls
* Transparency - This is the testing we do for our SDKs
  * Note, we have EXTENSIVE testing of the API-server, which is not represented by these tests.  These are just the SDK tests
* Promote testing
  * Every one of our SDK testing-examples comes with a working test environment, which you can use in your own projects
