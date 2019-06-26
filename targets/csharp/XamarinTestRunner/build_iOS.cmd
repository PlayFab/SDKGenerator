set CSProj=XamarinTestRunner\XamarinTestRunner.iOS\XamarinTestRunner.iOS.csproj
msbuild %CSProj% -t:Restore
msbuild %CSProj% ^
    -t:Rebuild ^
    -p:Configuration=Debug ^
    -p:Platform=iPhone ^
    -p:BuildIpa=true ^
    -p:ServerAddress=%Remote-Build_Mac_ip% -p:ServerUser=%Remote-Build_Mac_username%
