call mxmlc PfEntityApiTest.as -load-config flexcfg.xml

echo Build Code is %errorlevel%
if %errorlevel% EQU 0 (
    call adl PfEntityApiTest.xml -- %PF_TEST_TITLE_DATA_JSON%
) else pause

echo Test Code is %errorlevel%
if %errorlevel% NEQ 0 pause
