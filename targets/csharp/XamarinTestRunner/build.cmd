msbuild XamarinTestRunner\XamarinTestRunner.UWP\XamarinTestRunner.UWP.csproj ^
    -t:Build ^
    -p:Configuration=Debug ^
    -p:AppxPackageSigningEnabled=false
msbuild XamarinTestRunner\XamarinTestRunner.Android\XamarinTestRunner.Android.csproj ^
    -t:SignAndroidPackage ^
    -p:Configuration=Debug ^
    -p:EmbedAssembliesIntoApk=true
msbuild XamarinTestRunner\XamarinTestRunner.iOS\XamarinTestRunner.iOS.csproj ^
    -t:Rebuild ^
    -p:Configuration=Debug ^
    -p:Platform=iPhone ^
    -p:BuildIpa=true ^
    -p:ServerAddress=%Remote-Build_Mac_ip% -p:ServerUser=%Remote-Build_Mac_username%
