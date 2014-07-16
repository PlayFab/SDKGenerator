PlayFab SDK Generator
=============

This is a node.js based program that takes a json description of the PlayFab API and uses it to generate out all the different SDKs that must be kept up to date. This project also contains the sources for all PlayFab SDKs on all platforms. If you want to make a change in an SDK, this is where the change has to go.


##How to use

#Prerequisites:

1. You must have Node.js installed: http://nodejs.org/
2. You must have the PlayFab API spec json files: https://github.com/PlayFab/api-specs

#Usage:

To invoke the generator, open a command line at the root of the project and type:
```
node generate.js <apiSpecLocation> [<targetName>=<targetOutputLocation>] ...
```

&lt;apiSpecLocation&gt; is the directory containing the api spec json files obtained from the PlayFab api-specs repo.

Next you supply a list of targets to generate, and the directory to generate them to. Each target takes the form:

&lt;targetName&gt;=&lt;targetOutputLocation&gt;

Where &lt;targetName&gt; is one of the supported SDK targets, and &lt;targetOutputLocation&gt; is a path to a directory to generate the SDK in. Note: Make sure there are no spaces between he arguments and the equals sign. Additional

Example:

node generate.js ../api-specs csharp-unity=../sdks/unitySDK

