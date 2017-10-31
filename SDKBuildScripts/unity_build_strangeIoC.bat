pushd ..
rem === BUILDING UnitySDK ===
node generate.js csharp-unity-strangeioc=..\sdks\UnityStrangeIoC -apiSpecPath
popd
pause