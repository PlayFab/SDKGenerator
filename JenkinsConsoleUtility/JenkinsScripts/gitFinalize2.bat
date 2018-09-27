echo on
setlocal

IF "%PublishToGit%"=="true" (
    echo === Commit to Git ===
    pushd "%WORKSPACE%/sdks/%SdkName%"
    git fetch --progress origin
    git add -A
    git commit -m "%commitMessage%"
    git push origin $gitTarget -f -u
    popd
)

endlocal
pause
