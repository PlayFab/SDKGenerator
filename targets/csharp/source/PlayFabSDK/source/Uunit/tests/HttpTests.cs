#if !DISABLE_PLAYFABCLIENT_API

using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;

namespace PlayFab.UUnit
{
    public class HttpTests : UUnitTestCase
    {
        private IPlayFabPlugin realHttpPlugin = null;
        private MockTransport mockHttpPlugin = null;

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

            public async Task<object> DoPost(string urlPath, object request, Dictionary<string, string> headers)
            {
                if (code == HttpStatusCode.OK)
                    return successResultJson;
                else
                    return errorResult;
            }
        }

        public override void ClassSetUp()
        {
            if (string.IsNullOrEmpty(PlayFabSettings.staticSettings.TitleId))
                PlayFabSettings.staticSettings.TitleId = "ABCD";
            realHttpPlugin = PluginManager.GetPlugin<IPlayFabPlugin>(PluginContract.PlayFab_Transport);
            mockHttpPlugin = new MockTransport();
            PluginManager.SetPlugin(mockHttpPlugin, PluginContract.PlayFab_Transport);
        }

        public override void ClassTearDown()
        {
            if (realHttpPlugin != null)
                PluginManager.SetPlugin(realHttpPlugin, PluginContract.PlayFab_Transport);
        }

        [UUnitTest]
        public void Test200Response(UUnitTestContext testContext)
        {
            mockHttpPlugin.AssignResponse(HttpStatusCode.OK, "{\"data\": {\"RSAPublicKey\": \"Test Result\"} }", null);

            // GetTitlePublicKey has no auth, and trivial input/output so it's pretty ideal for a fake API call
            var task = PlayFabClientAPI.GetTitlePublicKeyAsync(null);
            task.Wait();

            testContext.IsNull(task.Result.Error);
            testContext.NotNull(task.Result.Result);
            testContext.StringEquals("Test Result", task.Result.Result.RSAPublicKey);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Test404Response(UUnitTestContext testContext)
        {
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.NotFound,
                HttpStatus = "NotFound",
                Error = PlayFabErrorCode.ServiceUnavailable,
                ErrorMessage = "Test error result",
            };
            mockHttpPlugin.AssignResponse(HttpStatusCode.NotFound, null, expectedError);

            // GetTitlePublicKey has no auth, and trivial input/output so it's pretty ideal for a fake API call
            var task = PlayFabClientAPI.GetTitlePublicKeyAsync(null);
            task.Wait();

            testContext.IsNull(task.Result.Result);
            testContext.NotNull(task.Result.Error);
            testContext.IntEquals(expectedError.HttpCode, task.Result.Error.HttpCode);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Test500Response(UUnitTestContext testContext)
        {
            var expectedError = new PlayFabError
            {
                HttpCode = (int)HttpStatusCode.InternalServerError,
                HttpStatus = "InternalServerError",
                Error = PlayFabErrorCode.InternalServerError,
                ErrorMessage = "Test error result",
            };
            mockHttpPlugin.AssignResponse(HttpStatusCode.InternalServerError, null, expectedError);

            // GetTitlePublicKey has no auth, and trivial input/output so it's pretty ideal for a fake API call
            var task = PlayFabClientAPI.GetTitlePublicKeyAsync(null);
            task.Wait();

            testContext.IsNull(task.Result.Result);
            testContext.NotNull(task.Result.Error);
            testContext.IntEquals(expectedError.HttpCode, task.Result.Error.HttpCode);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
#endif
