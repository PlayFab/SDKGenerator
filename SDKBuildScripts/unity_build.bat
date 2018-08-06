setlocal
set repoName=UnitySDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.cs
attrib -H *.meta /S /D
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING UnitySDK ===
node generate.js unity-v2=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING UnitySDK with params %* ===
node generate.js unity-v2=%destPath% %*
)
popd

pause
endlocal
