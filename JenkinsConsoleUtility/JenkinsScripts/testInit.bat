@echo off
setlocal
cd %WORKSPACE%

call :syncRepo pf-main %PatchRepoName%
pushd pf-main\Server
nuget restore Server.sln
popd
call :syncRepo SDKGenerator %PatchRepoName%
call :syncRepo API_Specs %PatchRepoName%
call :forcePushD sdks
call :syncRepo %SdkName% %PatchRepoName%
popd

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
if [%1]==[%2] (
    call arc patch %DIFF_NUMBER% --conduit-token %JENKINS_PHAB_TOKEN%
)
popd
goto :EOF
