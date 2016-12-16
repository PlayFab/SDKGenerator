echo off
setlocal
if "%1"=="" (
    set gitTarget=%AUTOMATED_GIT_REPO%
) ELSE (
    set gitTarget=%1
)

cd C:\depot\sdks\%SdkName%
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
