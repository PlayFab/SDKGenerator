// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1

using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using PlayFabAllSDK.Uunit;

namespace PlayFab.UUnit
{
    public class GameServerConfigTests : UUnitTestCase
    {
        private ISerializerPlugin _jsonWrapper;

        public override void ClassSetUp()
        {
            _jsonWrapper = PlayFab.PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
        }

        public override void ClassTearDown()
        {
            _jsonWrapper = null;
        }

        [UUnitTest]
        public void ReadConfiguration_MissingHeartbeatUrl_ShouldThrow(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                sessionHostId = "serverid" 
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                try
                {
                    GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                }
                catch (GSDKInitializationException e)
                {
                    testContext.True(e.Message.Contains(fileName), "Exception message should contain config filename.");
                    return Task.CompletedTask;
                }

                testContext.Fail("GSDKInitializationException expected on bad config.");
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void ReadConfiguration_MissingServerId_ShouldThrow(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                heartbeatEndpoint = "heartbeatendpoint"
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                try
                {
                    GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                }
                catch (GSDKInitializationException e)
                {
                    testContext.True(e.Message.Contains(fileName), "Exception message should contain config filename.");
                    return Task.CompletedTask;
                }

                testContext.Fail("GSDKInitializationException expected on bad config.");
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void ReadConfiguration_AdditionalAttributeInFile_Ignored(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
                foo = "berry",
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void ReadConfiguration_EmptyGameCertificates_Parsed(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
                gameCertificates = new
                {
                }
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                testContext.NotNull(c.GameCertificates);
                testContext.IntEquals(0, c.GameCertificates.Count);
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void ReadConfiguration_MultipleGameCertificates_Parsed(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
                gameCertificates = new Dictionary<string, string>
                {
                    { "gameCert", "onetwothree" },
                    { "gameCert2", "threefourfive"},
                }
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                testContext.NotNull(c.GameCertificates);
                testContext.IntEquals(2, c.GameCertificates.Count);
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void ReadConfiguration_EmptyGameGamePorts_Parsed(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
                gamePorts = new
                {
                }
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                testContext.NotNull(c.GamePorts);
                testContext.IntEquals(0, c.GamePorts.Count);
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void ReadConfiguration_MultipleGamePorts_Parsed(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
                gamePorts = new Dictionary<string, string>
                {
                    { "8080", "debug" },
                    { "8081", "debug" },
                }
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, (fileName) =>
            {
                GameServerConfiguration c = new JsonFileConfiguration(_jsonWrapper, fileName);
                testContext.NotNull(c.GamePorts);
                testContext.IntEquals(2, c.GamePorts.Count);
                return Task.CompletedTask;
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
#endif
