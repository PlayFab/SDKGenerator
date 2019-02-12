// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using PlayFabAllSDK.Uunit;

namespace PlayFab.UUnit
{
    public class GameServerSDKTests : UUnitTestCase
    {
        private MockGameServerHttp _clientMock = null;
        private ISerializerPlugin _jsonWrapper = null;

        private class MockGameServerHttp : IGameServerHttpClient
        {
            private HeartbeatResponse _response;

            public int HeartbeatCount { get; set; }
            public HeartbeatRequest LastRequest { get; private set; }

            public MockGameServerHttp()
            {
                AssignResponse(new HeartbeatResponse());
                HeartbeatCount = 0;
            }

            public void AssignResponse(HeartbeatResponse response)
            {
                _response = response;
            }
            
            public Task<HeartbeatResponse> SendHeartbeatAsync(HeartbeatRequest request)
            {
                HeartbeatCount++;
                LastRequest = request;
                return Task.FromResult(_response);
            }
        }

        public override void ClassSetUp()
        {
            _clientMock = new MockGameServerHttp();
            _jsonWrapper = PlayFab.PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
            GameServerHttpClientFactory.Instance = _clientMock;
        }

        public override void ClassTearDown()
        {
            _jsonWrapper = null;
            GameServerHttpClientFactory.Instance = null;
        }

        [UUnitTest]
        public void Start_InvalidConfiguration_Throws(UUnitTestContext testContext)
        {
            var testConfig = new { ShouldLog = false };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                try
                {
                    var sdk = new GameServerInternalSdk(fileName);
                    await sdk.StartAsync(false);
                }
                catch (GSDKInitializationException e)
                {
                    testContext.True(e.Message.Contains(fileName), "Exception message should contain config filename.");
                    return;
                }

                testContext.Fail("GSDKInitializationException expected on bad config.");
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Start_ValidConfiguration_Starts(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
                gameCertificates = new Dictionary<string, string>
                {
                    { "cert1", "thumb1" },
                    { "cert2", "thumb2" },
                    { "cert3", "thumb3" },
                },
                buildMetadata = new Dictionary<string, string>
                {
                    { "property1", "value1" },
                    { "property2", "value2" },
                    { "property3", "value3" },
                },
                gamePorts = new Dictionary<string, string>
                {
                    { "8080", "port1" },
                }
            };

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    await sdk.StartAsync(false);
                    testContext.ObjEquals(GameState.Invalid, sdk.State);
                    testContext.NotNull(sdk.ConfigMap);
                    testContext.True(sdk.ConfigMap.Count > 0, "GSDK Config should have more than 0 properties.");
                    testContext.NotNull(sdk.ConnectedPlayers);
                    testContext.IntEquals(0, sdk.ConnectedPlayers.Count);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void Start_DisposeShouldFire_HeartbeatStopped(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.HeartbeatCount = 0;

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                var sdk = new GameServerInternalSdk(fileName);

                try
                {
                    await sdk.StartAsync(false);
                    Thread.Sleep(1000);
                }
                finally
                {
                    sdk.Dispose();
                    Thread.Sleep(3000);
                    testContext.True(_clientMock.HeartbeatCount > 0 && _clientMock.HeartbeatCount <= 2, "Number of heartbeats should have stopped after Dispose");
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameStateToActive_ActiveReturned_StateUpdated(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Active
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    await sdk.StartAsync(false);

                    sdk.State = GameState.StandingBy;
                    sdk.TransitionToActiveEvent.WaitOne();
                    testContext.ObjEquals(GameState.Active, sdk.State);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_TerminateReturned_StateUpdated(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Terminate
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    await sdk.StartAsync(false);
                    Thread.Sleep(2000);

                    testContext.ObjEquals(GameState.Terminating, sdk.State);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_MaintDateReturned_CallbackInvoked(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Continue,
                NextScheduledMaintenanceUtc = "2018-11-12T04:11:14Z",
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                DateTimeOffset maintDate = DateTime.MinValue;
                var evt = new ManualResetEvent(false);

                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    sdk.MaintenanceCallback = (dt) =>
                    {
                        maintDate = dt;
                        evt.Set();
                    };

                    await sdk.StartAsync(false);

                    evt.WaitOne();
                    testContext.DateTimeEquals(DateTime.Parse(
                        "2018-11-12T04:11:14Z",
                        null,
                        DateTimeStyles.RoundtripKind), maintDate.DateTime, TimeSpan.FromMilliseconds(1));
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_MaintDateReturned_CallbackInvokedOnlyOnce(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Continue,
                NextScheduledMaintenanceUtc = "2018-11-12T04:11:14Z",
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                int invocationCount = 0;

                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    sdk.MaintenanceCallback = (dt) =>
                    {
                        invocationCount++;
                    };

                    await sdk.StartAsync(false);

                    Thread.Sleep(4000);
                    testContext.IntEquals(1, invocationCount);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_SessionConfigReturnedNoPlayers_ConfigMapUpdated(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Continue,
                SessionConfig = new SessionConfig()
                {
                    SessionId = Guid.NewGuid(),
                    SessionCookie = "awesomeCookie"
                }
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    await sdk.StartAsync(false);

                    testContext.False(sdk.ConfigMap.ContainsKey("sessionCookie"));
                    Thread.Sleep(2000);
                    testContext.True(sdk.ConfigMap.ContainsKey("sessionCookie"));
                    testContext.IntEquals(0, sdk.InitialPlayers.Count, "Initial Player List not returned");
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_SessionConfigReturnedWithPlayers_ConfigMapUpdated(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            List<string> playerList = new List<string>
            {
                "player1", "player2", "player3"
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Continue,
                SessionConfig = new SessionConfig()
                {
                    SessionId = Guid.NewGuid(),
                    SessionCookie = "awesomeCookie",
                    InitialPlayers = playerList
                }
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    await sdk.StartAsync(false);

                    testContext.False(sdk.ConfigMap.ContainsKey("sessionCookie"));
                    Thread.Sleep(2000);
                    testContext.True(sdk.ConfigMap.ContainsKey("sessionCookie"));
                    testContext.SequenceEquals(playerList, sdk.InitialPlayers, "Initial Player List returned");
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_TerminateReturned_CallbackInvoked(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Terminate
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                bool shutdownInvoked = false;

                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    sdk.ShutdownCallback = () => { shutdownInvoked = true; };

                    await sdk.StartAsync(false);
                    Thread.Sleep(2000);
                    testContext.True(shutdownInvoked);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_HealthCallbackReturnsUnhealthy_StatusSent(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Active
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    sdk.HealthCallback = () => { return false; };

                    await sdk.StartAsync(false);

                    sdk.State = GameState.StandingBy;
                    sdk.TransitionToActiveEvent.WaitOne();

                    testContext.NotNull(_clientMock.LastRequest);
                    testContext.StringEquals("Unhealthy", _clientMock.LastRequest.CurrentGameHealth);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        [UUnitTest]
        public void GameState_HealthCallbackReturnsHealthy_StatusSent(UUnitTestContext testContext)
        {
            var testConfig = new
            {
                ShouldLog = false,
                heartbeatEndpoint = "heartbeatendpoint",
                sessionHostId = "serverid",
            };

            _clientMock.AssignResponse(new HeartbeatResponse()
            {
                Operation = GameOperation.Active
            });

            var task = GameServerConfigFileHelper.WrapAsync(_jsonWrapper, testConfig, async (fileName) =>
            {
                using (var sdk = new GameServerInternalSdk(fileName))
                {
                    sdk.HealthCallback = () => { return true; };

                    await sdk.StartAsync(false);

                    sdk.State = GameState.StandingBy;
                    sdk.TransitionToActiveEvent.WaitOne();

                    testContext.NotNull(_clientMock.LastRequest);
                    testContext.StringEquals("Healthy", _clientMock.LastRequest.CurrentGameHealth);
                }
            });

            task.Wait();

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
#endif
