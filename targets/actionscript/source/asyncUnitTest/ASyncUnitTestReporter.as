package asyncUnitTest
{
    public interface ASyncUnitTestReporter
    {
        function ReportTestResult(testDuration:Number, testName:String, testResult:int, testMessage:String) : void;
        function ReportSuiteResult(suiteName:String, suiteSetUpDuration:Number, suiteTearDownDuration:Number, cumulativeSetUpTime:Number, cumulativeTearDownTime:Number,
            testsRun:int, testsPassed:int, testsFailed:int, testsErrored:int, testsTimedOut:int, testsSkipped:int) : void;
        function Debug(... args) : void;
    }
}
