pushd ..
call actionscript_build.bat
popd

pushd ..
call cocos_build.bat
popd

pushd ..
call csharp_build.bat
popd

pushd ..
call js_build.bat
popd

pushd ..
call node_build.bat
popd

pushd ..
call unity_build.bat
popd

pushd ..
call win_build.bat
popd
