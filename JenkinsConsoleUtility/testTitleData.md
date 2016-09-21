testTitleData.json
====

testTitleData.json is a file that is required by all of the example-test projects in most of the PlayFab sdks

Each example project serves two main purposes in each SDK:
* Demonstrate to a developer using PlayFab, how to make successful API calls
 * In particular, we demonstrate specific areas of maximum first-time-user benefit, like logging in, Player data and statistics
 * We also demonstrate Cloud Script, which is one of our most powerful features, but can also be somewhat difficult to use properly
* We also use this same code internally to determine if the SDK is actually working properly
 * This is our internal testing process, made transparent to all of our users, and in fact, usable by their own test-titles

This last portion, "running our tests on your own title" comes with a few requirements
* You must specify a testTitleData.json file which tells our tests which title to use
* You must unlock a security setting that allows clients to set player statistics (This setting should NOT be set for a live game which is server-authoritative)
* NOTE: Some tests have a hard coded titleId="6195" in those tests, which is us being sloppy, and we intend to fix these over time
 * Generally, it shouldn't hurt anything if you run your tests on our title, but it's better for both of us if you change this to your title when you see it

The format of the testTitleData.json file is as follows:
```json 
{
	"titleId": "<Found in PlayFab Game Manager>",
	"developerSecretKey": "<Found in PlayFab Game Manager>",
	"titleCanUpdateSettings": "true",
	"userEmail": "<your@email.com>",
	"characterName": "<CharName>"
}
```

Please note characterName is deprecated, and has already been removed from most of the test-examples in our SDKs.  For those few that remain, this can be any valid character name (Those test suites will usually create the character).

Please note, the path to testTitleData.json is hard coded in most of the examples to this: "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json"

Our own testTitleData.json is located at this location and contains the secret key for title 6195, and thus we do not publish this file.  You should change this path to your own testTitleData.json location, wherever it may be.

Philosophy
====

We feel that by showing you our own testing files, as examples of how to use our SDK, we are guaranteeing a few things:
* The example code in those files always works
 * Those tests must pass on our own automated testing server in order to be published, and therefore, it is a guaranteed working example of how to make those calls
* Transparency - This is the testing we do for our SDKs
 * Note, we have EXTENSIVE testing of the API-server, which is not represented by these tests.  These are just the SDK tests
* Promote testing
 * Every one of our SDK testing-examples comes with a working test environment, which you can use in your own projects
