#if !DISABLE_PLAYFABCLIENT_API

using PlayFab.ClientModels;
using PlayFab.Internal;
using PlayFab.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Reflection;
using System.Collections.Concurrent;

namespace PlayFab.UUnit
{
    public class PluginManagerTest : UUnitTestCase
    {
        private class CustomSerializerPlugin : ISerializerPlugin
        {
            public bool IsSerializeCalled = false;

            public T DeserializeObject<T>(string serialized)
            {
                throw new NotImplementedException();
            }

            public T DeserializeObject<T>(string serialized, object serializerStrategy)
            {
                throw new NotImplementedException();
            }

            public object DeserializeObject(string serialized)
            {
                throw new NotImplementedException();
            }

            public string SerializeObject(object obj)
            {
                this.IsSerializeCalled = true;
                return "{}";
            }

            public string SerializeObject(object obj, object serializerStrategy)
            {
                throw new NotImplementedException();
            }
        }

        private class CustomTransportPlugin : ITransportPlugin
        {
            public string Name;
            public bool IsDoPostCalled = false;

            public async Task<object> DoPost(string urlPath, object request, Dictionary<string, string> headers)
            {
                this.IsDoPostCalled = true;
                return "{}";
            }
        }

        private class CustomApi
        {
            public string PluginName;

            public async Task<object> SomeApiMethod()
            {
                var transport = (ITransportPlugin)PluginManager.GetPlugin(PluginContract.PlayFab_Transport, this.PluginName);
                return await transport.DoPost(null, null, null);
            }
        };

        // Functional
        private static bool TITLE_INFO_SET = false;

        // Fixed values provided from testInputs
        private static string USER_EMAIL;
        private static Dictionary<string, string> extraHeaders;

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(TestTitleData testInputs)
        {
            TITLE_INFO_SET = true;

            PlayFabSettings.TitleId = testInputs.titleId;
            USER_EMAIL = testInputs.userEmail;
            extraHeaders = testInputs.extraHeaders;

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET &= !string.IsNullOrEmpty(PlayFabSettings.TitleId)
                && !string.IsNullOrEmpty(USER_EMAIL);
        }

        public override void SetUp(UUnitTestContext testContext)
        {
            if (!TITLE_INFO_SET)
                testContext.Skip(); // We cannot do client tests if the titleId is not given
        }

        public override void Tick(UUnitTestContext testContext)
        {
            // No work needed, async tests will end themselves
        }

        public override void TearDown(UUnitTestContext testContext)
        {
        }

        private static void ContinueWithContext<T>(Task<PlayFabResult<T>> srcTask, UUnitTestContext testContext, Action<PlayFabResult<T>, UUnitTestContext, string> continueAction, bool expectSuccess, string failMessage, bool endTest) where T : PlayFabResultCommon
        {
            srcTask.ContinueWith(task =>
            {
                var failed = true;
                try
                {
                    if (expectSuccess)
                    {
                        testContext.NotNull(task.Result, failMessage);
                        testContext.IsNull(task.Result.Error, PlayFabUtil.GenerateErrorReport(task.Result.Error));
                        testContext.NotNull(task.Result.Result, failMessage);
                    }
                    if (continueAction != null)
                        continueAction.Invoke(task.Result, testContext, failMessage);
                    failed = false;
                }
                catch (UUnitSkipException uu)
                {
                    // Silence the assert and ensure the test is marked as complete - The exception is just to halt the test process
                    testContext.EndTest(UUnitFinishState.SKIPPED, uu.Message);
                }
                catch (UUnitException uu)
                {
                    // Silence the assert and ensure the test is marked as complete - The exception is just to halt the test process
                    testContext.EndTest(UUnitFinishState.FAILED, uu.Message + "\n" + uu.StackTrace);
                }
                catch (Exception e)
                {
                    // Report this exception as an unhandled failure in the test
                    testContext.EndTest(UUnitFinishState.FAILED, e.ToString());
                }
                if (!failed && endTest)
                    testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            );
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that plugin manager can use a custom serializer plugin and that it is called correctly.
        /// </summary>
        [UUnitTest]
        public void PluginManagerCustomPluginSerializer(UUnitTestContext testContext)
        {
            var playFabSerializer = PluginManager.GetPlugin(PluginContract.PlayFab_Serializer) as ISerializerPlugin;
            var customSerializer = new CustomSerializerPlugin();
            try
            {
                // Set custom serializer plugin
                PluginManager.SetPlugin(customSerializer, PluginContract.PlayFab_Serializer);

                // Call some PlayFab API 
                var getRequest = new GetUserDataRequest();
                var getDataTask = PlayFabClientAPI.GetUserDataAsync(getRequest, null, extraHeaders);
                ContinueWithContext(getDataTask, testContext, null, false, "GetUserData call failed", false);
                getDataTask.Wait();

                // Verify
                testContext.True(customSerializer.IsSerializeCalled);
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception e)
            {
                testContext.EndTest(UUnitFinishState.FAILED, e.ToString());
            }
            finally
            {
                // Restore the original plugin
                PluginManager.SetPlugin(playFabSerializer, PluginContract.PlayFab_Serializer);
            }
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that plugin manager can use a custom transport plugin and that it is called correctly.
        /// </summary>
        [UUnitTest]
        public void PluginManagerCustomPluginTransport(UUnitTestContext testContext)
        {
            var playFabTransport = PluginManager.GetPlugin(PluginContract.PlayFab_Transport) as ITransportPlugin;
            var customTransport = new CustomTransportPlugin();

            try
            {
                // Set custom transport plugin
                PluginManager.SetPlugin(customTransport, PluginContract.PlayFab_Transport);

                // Call some PlayFab API 
                var getRequest = new GetUserDataRequest();
                var getDataTask = PlayFabClientAPI.GetUserDataAsync(getRequest, null, extraHeaders);
                ContinueWithContext(getDataTask, testContext, null, false, "GetUserData call failed", false);
                getDataTask.Wait();

                // Verify
                testContext.True(customTransport.IsDoPostCalled);
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception e)
            {
                testContext.EndTest(UUnitFinishState.FAILED, e.ToString());
            }
            finally
            {
                // Restore the original plugin
                PluginManager.SetPlugin(playFabTransport, PluginContract.PlayFab_Transport);
            }
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that plugin manager can use multiple plugins with the same contract and that it works correctly.
        /// </summary>
        [UUnitTest]
        public void PluginManagerMultiplePluginsPerContract(UUnitTestContext testContext)
        {
            // Create multiple custom plugins, set them with the same contract
            const int pluginNumber = 4;
            var APIs = new CustomApi[pluginNumber];
            for (int i = 0; i < pluginNumber; i++)
            {
                var pluginName = "Plugin_" + i;
                var customTransport = new CustomTransportPlugin() { Name = pluginName };
                PluginManager.SetPlugin(customTransport, PluginContract.PlayFab_Transport, pluginName);
                APIs[i] = new CustomApi() { PluginName = pluginName };
            }

            try
            {
                // Call the APIs
                int totalNumberOfCalls = 0;
                var resultTasks = new ConcurrentBag<Task<object>>();
                Parallel.ForEach(APIs, api =>
                {
                    // Each API uses its specific transport plugin
                    Task<object> task = api.SomeApiMethod();
                    resultTasks.Add(task);
                    totalNumberOfCalls++;
                });

                var resultTasksArray = resultTasks.ToArray();
                Task.WaitAll(resultTasksArray);

                // Verify
                testContext.True(totalNumberOfCalls == pluginNumber);
                for (int i = 0; i < pluginNumber; i++)
                {
                    var pluginName = "Plugin_" + i;
                    var transportPlugin = PluginManager.GetPlugin(PluginContract.PlayFab_Transport, pluginName);
                    testContext.True(((CustomTransportPlugin)transportPlugin).IsDoPostCalled);
                }

                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception e)
            {
                testContext.EndTest(UUnitFinishState.FAILED, e.ToString());
            }
        }

        private static Task<PlayFabResult<T>> ThrowIfApiError<T>(Task<PlayFabResult<T>> original) where T : PlayFabResultCommon
        {
            return original.ContinueWith(_ =>
            {
                if (_.IsFaulted) throw _.Exception;
                if (_.Result.Error != null) throw new Exception(_.Result.Error.GenerateErrorReport());
                return _.Result;
            });
        }
    }
}
#endif
