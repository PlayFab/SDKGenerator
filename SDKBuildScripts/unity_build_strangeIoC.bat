pushd ..
rem === BUILDING UnitySDK ===
node generate.js csharp-unity-strangeioc=..\sdks\UnityStrangeIoC -apiSpecGitUrl
popd
pause