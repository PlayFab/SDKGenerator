rem echo off
setlocal
if "%1"=="" (
    set gitTarget=%AUTOMATED_GIT_REPO%
) ELSE (
    set gitTarget=%1
)

cd %WORKSPACE%

pushd SDKGenerator
if %errorLevel% EQU 1 (
    git clone git@github.com:PlayFab/SDKGenerator.git
    pushd SDKGenerator
)
git reset head .
git checkout -- .
git clean -df
git checkout master
git pull origin master
arc patch %DIFF_NUMBER%
popd

pushd API_Specs
if %errorLevel% EQU 1 (
    git clone git@github.com:PlayFab/API_Specs.git
    pushd API_Specs
)
git reset head .
git checkout -- .
git clean -df
git checkout master
git pull origin master
popd

pushd sdks\%SdkName%
if %errorLevel% EQU 1 (
    mkdir sdks
    pushd sdks
    git clone git@github.com:PlayFab/%SdkName%.git
    popd
    pushd sdks\%SdkName%
)
git reset head .
git checkout -- .
git clean -df
git checkout master
git pull origin master
popd

endlocal
exit /b 0
