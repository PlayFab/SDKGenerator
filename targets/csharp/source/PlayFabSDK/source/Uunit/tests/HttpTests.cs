#if !DISABLE_PLAYFABCLIENT_API

using PlayFab.ClientModels;
using PlayFab.Internal;
using PlayFab.MultiplayerModels;
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
        private PlayFabPollyHttp mockHttpPluginWithPolly = null;

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
            mockHttpPluginWithPolly = new PlayFabPollyHttp();
        }

        public override void ClassTearDown()
        {
            if (realHttpPlugin != null)
            {
                PluginManager.SetPlugin(realHttpPlugin, PluginContract.PlayFab_Transport);
            }
        }

        [UUnitTest]
        public void TestPluginWithoutPolly_OnSuccess_200Response(UUnitTestContext testContext)
        {
            PluginManager.SetPlugin(mockHttpPluginWithoutPolly, PluginContract.PlayFab_Transport);
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.OK, "{\"data\": {\"RSAPublicKey\": \"Test Result\"} }", null);

            var response = RunRequestAndVerifyResponseAsync(true, null, testContext).GetAwaiter().GetResult();

            testContext.StringEquals("Test Result", response.Result.RSAPublicKey);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void TestPluginWithPolly_Success(UUnitTestContext testContext)
        {
            PluginManager.SetPlugin(mockHttpPluginWithPolly, PluginContract.PlayFab_Transport);

            PlayFabResult<ClientModels.GetTitlePublicKeyResult> result = clientApi.GetTitlePublicKeyAsync(null).GetAwaiter().GetResult();

            testContext.NotNull(result.Result);
            testContext.IsNull(result.Error);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Test404Response_WithoutPolly_Success(UUnitTestContext testContext)
        {
            PluginManager.SetPlugin(mockHttpPluginWithoutPolly, PluginContract.PlayFab_Transport);
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.NotFound,
                HttpStatus = "NotFound",
                Error = PlayFabErrorCode.ServiceUnavailable,
                ErrorMessage = "Test error result",
            };
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.NotFound, null, expectedError);

            RunRequestAndVerifyResponseAsync(false, expectedError, testContext).GetAwaiter().GetResult();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Test500Response_WithoutPolly_Success(UUnitTestContext testContext)
        {
            PluginManager.SetPlugin(mockHttpPluginWithoutPolly, PluginContract.PlayFab_Transport);
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.InternalServerError,
                HttpStatus = "InternalServerError",
                Error = PlayFabErrorCode.InternalServerError,
                ErrorMessage = "Test error result",
            };
            mockHttpPluginWithoutPolly.AssignResponse(HttpStatusCode.InternalServerError, null, expectedError);

            RunRequestAndVerifyResponseAsync(false, expectedError, testContext).GetAwaiter().GetResult();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Test400Response_TriggerPollyOnExcessiveCalls_Success(UUnitTestContext testContext)
        {
            PluginManager.SetPlugin(mockHttpPluginWithPolly, PluginContract.PlayFab_Transport);
            
            // In order to test one of the trigger for polly get hit, we need to add 400 because 
            // the endpoint we are calling will return 400, its the only way to test this without auth. 
            // The request sent to playfab is faultly thus we get back a 400 on the public api.
            const int numberOfFailures = 10;
            int numberOfTimesThrottled = 0;
            var getPublicKeysRequestTasks = Enumerable.Range(0, numberOfFailures).Select(async _ =>
            {
                try
                {
                   
                    var result = mockHttpPluginWithPolly.DoPost($"https://{PlayFabSettings.staticSettings.TitleId}.playfabapi.com/MultiplayerServer/ListPartyQosServers", null, null).GetAwaiter().GetResult();
                    var response = result as PlayFabJsonSuccess<ListPartyQosServersResponse>;
                    testContext.NotNull(response);
                }
                catch (Polly.CircuitBreaker.BrokenCircuitException)
                {
                    numberOfTimesThrottled++;
                }
            });


            Task.WhenAll(getPublicKeysRequestTasks).Wait();
            testContext.True(numberOfTimesThrottled != 0);

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
