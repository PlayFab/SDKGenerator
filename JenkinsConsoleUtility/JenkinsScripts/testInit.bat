@echo off
setlocal

if [%SHARED_WORKSPACE%]==[] (
    set SHARED_WORKSPACE=%WORKSPACE%\..\shared\%EXECUTOR_NUMBER%
)

call :forceCD %SHARED_WORKSPACE%
call :syncRepo pf-main
pushd pf-main\Server
nuget restore Server.sln
popd
call :forceCD %WORKSPACE%
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

rem USAGE: call :forceCD <path>
:forceCD
cd %1
if %errorLevel% EQU 1 (
    mkdir %1
    cd %1
)
goto :EOF

rem USAGE: call :syncRepo <RepoName>
:syncRepo
echo ==== syncRepo %cd% %1 ====
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
echo ==== syncRepo Done ====
goto :EOF

rem USAGE: call :cleanArcPatches
:cleanArcPatches
echo ==== cleanArcPatches %cd% ====
pushd SDKGenerator\JenkinsConsoleUtility\JenkinsScripts
call delArcPatches.sh "%SHARED_WORKSPACE%\pf-main"
call delArcPatches.sh "%WORKSPACE%\SDKGenerator"
call delArcPatches.sh "%WORKSPACE%\sdks\%SdkName%"
echo ==== cleanArcPatches Done ====
goto :EOF

rem USAGE: call :applyArcPatch
:applyArcPatch
echo ==== applyArcPatch %cd% %PatchRepoName% ====
if [%PatchRepoName%]==[pf-main] (
    cd %SHARED_WORKSPACE%\%PatchRepoName%
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
if [%PatchRepoName%]==[SDKGenerator] (
    cd %WORKSPACE%\%PatchRepoName%
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
if [%PatchRepoName%]==[%SdkName%] (
    cd %WORKSPACE%\sdks\%PatchRepoName%
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
echo ==== applyArcPatch Done ====
goto :EOF
