echo off
setlocal
if "%1"=="" (
    set gitTarget=%AUTOMATED_GIT_BRANCH%
) ELSE (
    set gitTarget=%1
)

rem === Clean the %gitTarget% branch for %SdkName% ===
if [%SHARED_WORKSPACE%] EQU [] (
    set SHARED_WORKSPACE=c:/depot
)
cd %SHARED_WORKSPACE%\sdks\%SdkName%
if [%GITHUB_EMAIL%] NEQ [] (
    git config user.email "%GITHUB_EMAIL%"
)
git checkout master
git pull origin master

IF "%gitTarget%" NEQ "master" (
    IF "%PublishToGit%"=="true" (
        git branch -D %gitTarget%
        git checkout -b %gitTarget%
        git push origin %gitTarget% -f -u
    ) else (
        git checkout -b %gitTarget%
        git checkout %gitTarget%
    )
)

endlocal
