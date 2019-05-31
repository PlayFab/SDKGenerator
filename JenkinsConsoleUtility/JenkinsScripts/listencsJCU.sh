echo === Execute $SdkName UnitTests ===
cd "$WORKSPACE\SDKGenerator\JenkinsConsoleUtility\bin\Debug"
./JenkinsConsoleUtility.exe --listencs -buildIdentifier JBuild_${SdkName}_${VerticalName}_${NODE_NAME}_${EXECUTOR_NUMBER} -workspacePath "$WORKSPACE" -timeout 60 -verbose true
if [ ! -z "$killTaskName" ]; then
    cmd <<< "JenkinsConsoleUtility.exe --kill -taskname $killTaskName"
fi
