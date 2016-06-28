package asyncUnitTest
{
    // This file is part of asyncUnitTest, but it specifically requires the PlayFab ActionScriptSDK
    import com.playfab.PlayFabVersion;
    import com.playfab.ClientModels.*;
    import com.playfab.PlayFabClientAPI;

    public class ASyncUnitTestCloudScriptReporter implements ASyncUnitTestReporter
    {
        private var report:Object = {
            name: PlayFabVersion.BuildIdentifier,
            tests: 0,
            failures: 0,
            errors: 0,
            skipped: 0,
            time: 0.0,
            testResults: new Array(),
            properties: null
        };

        public function ASyncUnitTestCloudScriptReporter()
        {
        }

        public function ReportTestResult(testDuration:Number, testName:String, testResult:int, testMessage:String) : void
        {
            var testReport:Object = {
                classname: PlayFabVersion.BuildIdentifier,
                name: testName,
                time: testDuration / 1000.0,
                message: testMessage,
                failureText: null
            };

            switch (testResult)
            {
                case ASyncUnitTestEvent.RESULT_SKIPPED: testReport.failureText = "SKIPPED"; break;
                case ASyncUnitTestEvent.RESULT_ERROR: testReport.failureText = "ERROR"; break;
                case ASyncUnitTestEvent.RESULT_FAILED: testReport.failureText = "FAILED"; break;
                case ASyncUnitTestEvent.RESULT_TIMED_OUT: testReport.failureText = "TIMED_OUT"; break;
                case ASyncUnitTestEvent.RESULT_PASSED: testReport.failureText = null; break;
            }

            report.testResults.unshift(testReport);
        }

        public function ReportSuiteResult(suiteName:String, suiteSetUpDuration:Number, suiteTearDownDuration:Number, cumulativeSetUpTime:Number, cumulativeTearDownTime:Number,
            testsRun:int, testsPassed:int, testsFailed:int, testsErrored:int, testsTimedOut:int, testsSkipped:int) : void
        {
            // Update the report values
            report.tests = testsRun;
            report.failures = testsFailed;
            report.errors = testsErrored;
            report.skipped = testsSkipped;
            report.time = 0.0;

            var hwRequest:com.playfab.ClientModels.ExecuteCloudScriptRequest = new com.playfab.ClientModels.ExecuteCloudScriptRequest();
            hwRequest.FunctionName = "SaveTestData";
            hwRequest.FunctionParameter = { customId: PlayFabVersion.BuildIdentifier, testReport: new Array() };
            hwRequest.FunctionParameter.testReport.unshift(report);
            hwRequest.GeneratePlayStreamEvent = true;
            PlayFabClientAPI.ExecuteCloudScript(hwRequest, null, null);
        }

        public function Debug(... args) : void
        {
            var line:String = "";
            for (var i:int = 0; i < args.length; i++)
            {
                if (i != 0)
                    line += ", ";
                line += args[i];
            }

            if (report.properties == null) {
                report.properties = new Object;
                report.properties.logs = "";
            } else {
                report.properties.logs += "";
            }
            
            report.properties.logs += line;
        }
    }
}
