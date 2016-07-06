pushd ..
rem === BUILDING UnitySDK with params %* ===
rem === This script requires %1=GitRepoName.  Additional required parameter: -buildIdentifier, and additionally may specify flags ===
rem === Example usage: unity_customRepo.bat %SdkName% %SdkGenArgs% -buildIdentifier JBuild_%SdkName%_%EXECUTOR_NUMBER% ===
node generate.js ..\API_Specs csharp-unity=..\sdks\%*
popd
