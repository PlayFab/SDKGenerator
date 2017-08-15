echo off
setlocal
if "%1"=="" (
    set gitTarget=%AUTOMATED_GIT_BRANCH%
) ELSE (
    set gitTarget=%1
)

if [%SHARED_WORKSPACE%] EQU [] (
    set SHARED_WORKSPACE=c:/depot
)
cd %SHARED_WORKSPACE%\sdks\%SdkName%
IF "%PublishToGit%"=="true" (
    echo === Commit to Git ===
    git add -A
    git commit -m "%commitMessage%"
    git push origin %gitTarget%
)
IF "%PublishToGit%"=="false" (
(
    echo === Revert files (do not commit this version) ===
    call git checkout -- .
)

endlocal
