setlocal
set repoName=Cocos2d-xSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.h
del /S *.cpp
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING Cocos2d-xSDK ===
node generate.js cpp-cocos2dx=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING Cocos2d-xSDK with params %* ===
node generate.js cpp-cocos2dx=%destPath% %*
)
popd

pause
endlocal
