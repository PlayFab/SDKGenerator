rem call npm install -g nodeunit
rem call npm install nodeunit

cd test
set cd=%cd%
IF "%PF_TEST_TITLE_DATA_JSON%"=="" set PF_TEST_TITLE_DATA_JSON=./testTitleData.json
echo %cd%
call nodeunit test.js --reporter %cd%\reporter.js 
pause
