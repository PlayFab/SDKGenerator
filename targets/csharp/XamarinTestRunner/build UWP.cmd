set CSProj=XamarinTestRunner\XamarinTestRunner.UWP\XamarinTestRunner.UWP.csproj
msbuild %CSProj% -t:Restore
msbuild %CSProj% ^
    -t:Build ^
    -p:Configuration=Debug ^
    -p:AppxPackageSigningEnabled=false

