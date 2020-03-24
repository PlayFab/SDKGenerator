echo USAGE: This script is meant to be run from one folder up, via the "npm run test" command

cd %dp0%
echo Current Directory: %cd%

if "%PF_TEST_TITLE_DATA_JSON%"=="" set PF_TEST_TITLE_DATA_JSON=./testTitleData.json
echo PF_TEST_TITLE_DATA_JSON: %PF_TEST_TITLE_DATA_JSON%

call nodeunit "%cd%\test\test.js" --reporter "%cd%\test\reporter.js"

set finalOutput=%errorlevel%
rem pause
exit /b %finalOutput%
