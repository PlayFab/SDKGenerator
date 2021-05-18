using PlayFab.Json;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility.Testing
{
    public class TestJsonReportSyntax : UUnitTestCase
    {
        // This is here to ensure that json uploaded as part of a test will be read correctly by JCU
        // Modify this string with the actual submitted json to test each upload
        public const string EXAMPLE_JSON = "[{ \"name\": \"pg_cocossdk_148\", \"tests\": 11, \"failures\": 0, \"errors\": 0, \"skipped\": 0, \"time\": 3.302, \"timestamp\": \"1970-01-01T01:00:12.000Z\", \"testResults\": [{ \"classname\": \"pg_cocossdk_148\", \"name\": \"InvalidLogin\", \"time\": 1.415, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"InvalidRegistration\", \"time\": 0.066, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"LoginOrRegister\", \"time\": 0.168, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"UserDataApi\", \"time\": 0.284, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"UserStatisticsApi\", \"time\": 0.282, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"UserCharacter\", \"time\": 0.082, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"LeaderBoard\", \"time\": 0.101, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"AccountInfo\", \"time\": 0.084, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"CloudScript\", \"time\": 0.167, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }, { \"classname\": \"pg_cocossdk_148\", \"name\": \"WriteEvent\", \"time\": 0.102, \"message\": \"\", \"failureText\": \"PASSED\", \"finishState\": \"PASSED\" }]}]";
        public readonly string[] EXPECTED_TESTS = {
            "InvalidLogin",
            "InvalidRegistration",
            "LoginOrRegister",
            "UserDataApi",
            "UserStatisticsApi",
            "UserCharacter",
            "LeaderBoard",
            "AccountInfo",
            "CloudScript",
            "WriteEvent",
        };

        [UUnitTest]
        public void SerializeExample(UUnitTestContext testContext)
        {
            TestSuiteReport[] actualSuites = JsonWrapper.DeserializeObject<TestSuiteReport[]>(EXAMPLE_JSON);
            testContext.NotNull(actualSuites);

            foreach (var expectedTestName in EXPECTED_TESTS)
            {
                var testFound = false;
                foreach (var suite in actualSuites)
                {
                    foreach (var test in suite.testResults)
                    {
                        if (test.name == expectedTestName)
                        {
                            testFound = true;
                            break;
                        }
                    }
                    testContext.IntEquals(suite.tests, EXPECTED_TESTS.Length, "Total tests does not match expected {0}, {1}");
                }
                testContext.True(testFound, "Test not found: " + expectedTestName);
            }

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
