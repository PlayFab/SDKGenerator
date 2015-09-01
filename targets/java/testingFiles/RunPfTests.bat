@echo off
del /S *.class >nul 2>&1
@echo on
javac -cp .;junit-4.12.jar PlayFabApiTest.java
java -DtestTitleData=C:\depot\pf-main\tools\SDKBuildScripts\testTitleData.json -cp .;junit-4.12.jar;hamcrest-core-1.3.jar org.junit.runner.JUnitCore PlayFabApiTest
pause