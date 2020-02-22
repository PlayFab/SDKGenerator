set CSProj=XamarinTestRunner\XamarinTestRunner.Android\XamarinTestRunner.Android.csproj
msbuild %CSProj% ^
    -t:Restore ^
    -p:AndroidSdkDirectory=%ANDROID_HOME%
msbuild %CSProj% ^
    -t:SignAndroidPackage ^
    -p:Configuration=Debug ^
    -p:EmbedAssembliesIntoApk=true ^
    -p:AndroidSdkDirectory=%ANDROID_HOME%
