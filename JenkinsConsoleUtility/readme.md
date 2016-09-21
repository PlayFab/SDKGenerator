JenkinsConsoleUtility Readme
====

We at PlayFab use Jenkins to automate most of our testing, both for our closed-source API-Server, and our open-source SDKs.

JenkinsConsoleUtility (shortened to JCU) is open source, and focuses exclusively on relaying test reports from SDKs built to difficult targets, back into Jenkins in a format familiar to Jenkins. For example, many of our SDKs are deployed to phones or devices, which are not running our Jenkins builder. Jenkins kicks off a build to the device, and then runs JCU, which waits for the device to upload test results.  When finished, those test results are posted to the Jenkins job.

There are some requirements to make this work:
* We highly suggest you create a test title which is exclusively for running our tests, which you will not use for your actual game development
* In your own test title, a specific set of CloudScript functions must be appended to your own
 * They are provided here: https://github.com/PlayFab/SDKGenerator/blob/master/JenkinsConsoleUtility/jcuCloudScript.js
* You must be running our testing-example projects, provided with most of our sdks
 * Any sdk with semi-weekly releases should have this test project included with the SDK
* You must provide a testTitleData.json file to the test-example
 * See the detailed described here: https://github.com/PlayFab/SDKGenerator/blob/master/JenkinsConsoleUtility/testTitleData.md
* You must ENABLE the "Allow client to post player statistics" option in the PlayFab Game Manager
 * PlayFab Website -> Login -> Find your title -> Settings -> API-Features -> check-box
 * For server-authoritative games, or games with leaderboards, this is not suggested, hence the importance of creating a separate title

Full documentation of the JCU will be posted here eventually. This isn't designed to be a primary product for our customers to use. It's open source because there's nothing sensitive here, and we're happy to demonstrate our SDK testing process.
