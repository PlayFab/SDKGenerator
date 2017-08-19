echo on
setlocal

IF "%PublishToGit%"=="true" (
    echo === Commit to Git ===
    cd "%WORKSPACE%/sdks/%SdkName%"
    git add -A
    git commit -m "%commitMessage%"
    git push origin %gitTarget%
)

endlocal
pause