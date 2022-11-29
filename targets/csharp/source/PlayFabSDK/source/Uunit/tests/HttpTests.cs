#if !DISABLE_PLAYFABCLIENT_API

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace PlayFab.UUnit
{
    public class HttpTests : UUnitTestCase
    {
        private IPlayFabPlugin realHttpPlugin = null;
        private MockTransport mockHttpPluginWithoutPolly = null;
        private MockTransport mockHttpPluginWithPolly = null;


        private readonly PlayFabClientInstanceAPI clientApi = new PlayFabClientInstanceAPI(PlayFabSettings.staticPlayer);

        private class MockTransport : ITransportPlugin
        {
            public static HttpStatusCode code;
            public static string successResultJson;
            public static PlayFabError errorResult;

            public MockTransport(HttpStatusCode code = HttpStatusCode.OK, string successResultJson = null, PlayFabError errorResult = null)
            {
                AssignResponse(code, successResultJson, errorResult);
            }

            public void AssignResponse(HttpStatusCode code, string successResultJson, PlayFabError errorResult)
            {
                MockTransport.code = code;
                MockTransport.successResultJson = successResultJson;
                MockTransport.errorResult = errorResult;
            }
#pragma warning disable 1998
            public async Task<object> DoPost(string urlPath, object request, Dictionary<string, string> headers)
            {
                if (code == HttpStatusCode.OK)
                    return successResultJson;
                else
                    return errorResult;
            }
#pragma warning restore 1998
        }

        public override void ClassSetUp()
        {
            if (string.IsNullOrEmpty(PlayFabSettings.staticSettings.TitleId))
            {
                PlayFabSettings.staticSettings.TitleId = "ABCD";
            }
            realHttpPlugin = PluginManager.GetPlugin<IPlayFabPlugin>(PluginContract.PlayFab_Transport);
            mockHttpPluginWithoutPolly = new MockTransport();
            PluginManager.SetPlugin(mockHttpPluginWithoutPolly, PluginContract.PlayFab_Transport);
        }

        public override void ClassTearDown()
        {
            if (realHttpPlugin != null)
            {
                PluginManager.SetPlugin(realHttpPlugin, PluginContract.PlayFab_Transport);
            }
        }

        [UUnitTest]
        public async void TestPluginWithoutPolly_OnSuccess_200Response(UUnitTestContext testContext)
        {
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.OK, "{\"data\": {\"RSAPublicKey\": \"Test Result\"} }", null);

            var response = await RunRequestAndVerifyResponseAsync(true, null, testContext);

            testContext.StringEquals("Test Result", response.Result.RSAPublicKey);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public async Task TestPluginWithPolly_OnSuccess_200Response(UUnitTestContext testContext)
        {
            mockHttpPluginWithPolly.AssignResponse(HttpStatusCode.OK, "{\"data\": {\"RSAPublicKey\": \"Test Result\"} }", null);

            var response = await RunRequestAndVerifyResponseAsync(true, null, testContext);

            testContext.StringEquals("Test Result", response.Result.RSAPublicKey);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public async Task Test404Response(UUnitTestContext testContext)
        {
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.NotFound,
                HttpStatus = "NotFound",
                Error = PlayFabErrorCode.ServiceUnavailable,
                ErrorMessage = "Test error result",
            };
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.NotFound, null, expectedError);

            await RunRequestAndVerifyResponseAsync(false, expectedError, testContext);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public async Task Test500Response(UUnitTestContext testContext)
        {
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.InternalServerError,
                HttpStatus = "InternalServerError",
                Error = PlayFabErrorCode.InternalServerError,
                ErrorMessage = "Test error result",
            };
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.InternalServerError, null, expectedError);

            await RunRequestAndVerifyResponseAsync(false, expectedError, testContext);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }


        [UUnitTest]
        public async Task Test500ResponseTriggerPolly(UUnitTestContext testContext)
        {
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.InternalServerError,
                HttpStatus = "InternalServerError",
                Error = PlayFabErrorCode.InternalServerError,
                ErrorMessage = "Test error result",
            };
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.InternalServerError, null, expectedError);

            const int numberOfFailures = 10;
            int numberOfExpected500s = 0;
            int numberOfTimesThrottled = 0;
            var getPublicKeysRequestTasks = Enumerable.Range(0, numberOfFailures).Select(async _ =>
            {
                try
                {
                    PlayFabResult<PlayFab.ClientModels.GetTitlePublicKeyResult> result = await clientApi.GetTitlePublicKeyAsync(null);

                    // Verify we were able to get the 500 back
                    testContext.IsNull(result.Result);
                    testContext.NotNull(result.Error);
                    numberOfExpected500s++;
                }
                catch (Exception)
                {
                    numberOfTimesThrottled++;
                }
            });

            await Task.WhenAll(getPublicKeysRequestTasks);

            testContext.True(numberOfTimesThrottled != 0);
            testContext.True(numberOfExpected500s != 0);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        private async Task<PlayFabResult<ClientModels.GetTitlePublicKeyResult>> RunRequestAndVerifyResponseAsync(
            bool shouldExpectSuccess, PlayFabError expectedError, UUnitTestContext testContext)
        {
            // GetTitlePublicKey has no auth, and trivial input/output so it's pretty ideal for a fake API call
            PlayFabResult<PlayFab.ClientModels.GetTitlePublicKeyResult> result = await clientApi.GetTitlePublicKeyAsync(null);
            if (shouldExpectSuccess)
            {
                testContext.NotNull(result.Result);
                testContext.IsNull(result.Error);
            }
            else
            {
                testContext.IsNull(result.Result);
                testContext.NotNull(result.Error);
                testContext.IntEquals(expectedError.HttpCode, result.Error.HttpCode);
            }

            return result;
        }
    }
}

#endif
