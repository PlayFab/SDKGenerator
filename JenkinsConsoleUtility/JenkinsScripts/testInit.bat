@echo off
setlocal
cd %WORKSPACE%

call :syncRepo pf-main
pushd pf-main\Server
nuget restore Server.sln
popd
call :syncRepo SDKGenerator
call :syncRepo API_Specs
call :forcePushD sdks
call :syncRepo %SdkName%
popd

call :cleanArcPatches
call :applyArcPatch

endlocal
exit %errorLevel%


rem USAGE: call :forcePushD <path>
:forcePushD
pushd %1
if %errorLevel% EQU 1 (
    mkdir %1
    pushd %1
)
goto :EOF

rem USAGE: call :syncRepo <RepoName> <PatchRepoName>
:syncRepo
pushd %1
if %errorLevel% EQU 1 (
    git clone git@github.com:PlayFab/%1.git
    pushd %1
)
git reset head .
git checkout -- .
git clean -df
git checkout master
git pull origin master
)
popd
goto :EOF

rem USAGE: call :cleanArcPatches
:cleanArcPatches
pushd SDKGenerator\JenkinsConsoleUtility\JenkinsScripts
call delArcPatches.sh "%WORKSPACE%\pf-main"
call delArcPatches.sh "%WORKSPACE%\SDKGenerator"
call delArcPatches.sh "%WORKSPACE%\sdks\%SdkName%"
goto :EOF

rem USAGE: call :applyArcPatch
:applyArcPatch
if [%PatchRepoName%]==[pf-main] (
    cd %PatchRepoName%
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
if [%PatchRepoName%]==[SDKGenerator] (
    cd %PatchRepoName%
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
if [%PatchRepoName%]==[%SdkName%] (
    cd sdks\%PatchRepoName%
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
goto :EOF
