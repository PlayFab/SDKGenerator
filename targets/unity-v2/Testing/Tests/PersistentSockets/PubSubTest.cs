#if ENABLE_PLAYFABPUBSUB_API

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PlayFab.UUnit
{
    public class PubSubTest : UUnitTestCase
    {
        static PlayFab.EventsModels.EntityKey _MyEntityKey = null;
        static string _previousTitleId = null;

        private PubSub pubSub;

        TimeSpan writeDelay = new TimeSpan(0, 0, 0, 3);
        DateTime nextWrite;

        private const string ns = "com.playfab.events.test";
        private const string testName = "testevent";

        public override void SetUp(UUnitTestContext testContext)
        {
            // specific title id for relay test
            _previousTitleId = PlayFabSettings.TitleId;
            PlayFabSettings.TitleId = "70B02F89";
            PlayFabSettings.VerticalName = "spi";
            UpdateNextWriteTime();
        }

        private void UpdateNextWriteTime()
        {
            nextWrite = DateTime.Now + writeDelay;
        }

        public override void Tick(UUnitTestContext testContext)
        {
            switch (testContext.Name)
            {
                default:
                case "PubSub_SubscribeAndRegister_Functionality":
                    DefaultTestTick();
                    break;
                case "PubSub_MultiTopic_Functionality":
                    MultiTopicTestTick(1);
                    break;
            }
        }

        public void MultiTopicTestTick(int testTopicCount)
        {
            if (pubSub != null && pubSub.State == PersistentSocketState.Opened && DateTime.Now > nextWrite)
            {
                UpdateNextWriteTime();

                for (int i = 0; i < testTopicCount; ++i)
                {
                    EventsModels.WriteEventsRequest req = new EventsModels.WriteEventsRequest();

                    EventsModels.EventContents ec = new EventsModels.EventContents();

                    ec.Entity = new EventsModels.EntityKey();
                    ec.Entity.Id = _MyEntityKey.Id;
                    ec.Entity.Type = _MyEntityKey.Type;
                    ec.Name = testName + i.ToString();

                    ec.EventNamespace = ns;
                    ec.PayloadJSON = $"{{\"CurrentTime\" : \"{DateTime.Now}\"}}";

                    req.Events = new List<EventsModels.EventContents>();
                    req.Events.Add(ec);

                    PlayFabEventsAPI.WriteEvents(req, null, null);
                }
            }
        }

        public void DefaultTestTick()
        {
            if (pubSub != null && pubSub.State == PersistentSocketState.Opened && DateTime.Now > nextWrite)
            {
                UpdateNextWriteTime();
                EventsModels.WriteEventsRequest req = new EventsModels.WriteEventsRequest();

                EventsModels.EventContents ec = new EventsModels.EventContents();

                ec.Entity = new EventsModels.EntityKey();
                ec.Entity.Id = _MyEntityKey.Id;
                ec.Entity.Type = _MyEntityKey.Type;
                ec.Name = testName + "0";

                ec.EventNamespace = ns;
                ec.PayloadJSON = $"{{\"CurrentTime\" : \"{DateTime.Now}\"}}";

                req.Events = new List<EventsModels.EventContents>();
                req.Events.Add(ec);

                PlayFabEventsAPI.WriteEvents(req, null, null);
            }
        }

        public override void TearDown(UUnitTestContext testContext)
        {
            PlayFabSettings.TitleId = _previousTitleId;
            PlayFabSettings.VerticalName = null;
        }

        public override void ClassTearDown()
        {
        }

        [UUnitTest]
        public void PubSub_SubscribeAndRegister_Functionality(UUnitTestContext testContext)
        {
            LogMeIn(testContext);
        }

        [UUnitTest]
        public void PubSub_OnConnected_Functionality(UUnitTestContext testContext)
        {
            LogMeIn(testContext);
        }

        [UUnitTest]
        public void PubSub_OnDisconnected_Functionality(UUnitTestContext testContext)
        {
            LogMeIn(testContext);
        }

        [UUnitTest]
        public void PubSub_MultiHandler_Functionality(UUnitTestContext testContext)
        {
            LogMeIn(testContext);
        }

        [UUnitTest]
        public void PubSub_MultiTopic_Functionality(UUnitTestContext testContext)
        {
            LogMeIn(testContext);
        }

        [UUnitTest]
        public void PubSub_MultiTopic_Stress(UUnitTestContext testContext)
        {
            LogMeIn(testContext);
        }

        /// <summary>
        /// This test will subscribe and register multiple topics and handlers.ONCE WE RECIEVE A MESSAGE, UNSUBCRIBE.And do this a TON OF TIMES
        /// </summary>
        /// <param name = "result" ></ param >
        //[UUnitTest]
        //public void PubSub_MultiRegisterCycle_Stress(UUnitTestContext testContext)
        //{
        //    LogMeIn(testContext);
        //}

        void OnDisconnected_LoginSuccess(ClientModels.LoginResult result)
        {
            var topic = GetTestTopic(result.EntityToken.Entity);

            pubSub = new PubSub();

            pubSub.OnDisconnect += () =>
            {
                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "");
            };

            pubSub.Dispose();
        }

        void Functionality_LoginSuccess(ClientModels.LoginResult result)
        {
            var topic = GetTestTopic(result.EntityToken.Entity);

            pubSub = new PubSub();
            pubSub.OnConnect += () =>
            {
                pubSub.SubscribeAsync(topic,
                    ps =>
                    {
                        ps.Register(topic, message =>
                        {
                            ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "");
                        });
                    });
            };
        }

        void OnConnected_LoginSuccess(ClientModels.LoginResult result)
        {
            pubSub = new PubSub();
            pubSub.OnConnect += () =>
            {
                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "");
            };
        }

        void OnMultiHandler_LoginSuccess(ClientModels.LoginResult result)
        {
            bool firstHandlerHit = false;
            bool secondHanlderHit = false;
            var topic = GetTestTopic(result.EntityToken.Entity);

            pubSub = new PubSub();
            pubSub.OnConnect += () =>
            {
                pubSub.SubscribeAsync(topic,
                    ps =>
                    {
                        ps.Register(topic, message =>
                        {
                            if (secondHanlderHit)
                            {
                                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, " This Test passed, but not in an expected order");
                            }
                            firstHandlerHit = true;
                        });

                        ps.Register(topic, message =>
                        {
                            if(firstHandlerHit)
                            {
                                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, " This Test passed in the order as expected. ");
                            }
                            secondHanlderHit = true;
                        });
                    });
            };
        }

        void OnMultiTopic_LoginSuccess(ClientModels.LoginResult result)
        {
            var topic = GetTestTopic(result.EntityToken.Entity);
            var topic2 = GetMultiTestTopic(result.EntityToken.Entity, 0);

            bool firstTopicHandled = false;
            bool secondTopicHandled = false;

            pubSub = new PubSub();
            pubSub.OnConnect += () =>
            {
                pubSub.SubscribeAsync(topic,
                    ps =>
                    {
                        ps.Register(topic, message =>
                        {
                            if (secondTopicHandled)
                            {
                                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "");
                            }
                            firstTopicHandled = true;
                        });
                    });

                pubSub.SubscribeAsync(topic2,
                    ps =>
                    {
                        ps.Register(topic, message =>
                        {
                            if(firstTopicHandled)
                            {
                                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "");
                            }
                            secondTopicHandled = true;
                        });
                    });
            };
        }

        void OnMultiTopicPerf_LoginSuccess(ClientModels.LoginResult result)
        {
            // how fast can we push out 1000 events?
            var topic = GetTestTopic(result.EntityToken.Entity);
            const int testSize = 1000;
            int numReceived = 0;

            pubSub = new PubSub();
            pubSub.OnConnect += () =>
            {
                DateTime testStart = DateTime.Now;
                for (int i = 0; i < testSize; ++i)
                {
                    pubSub.SubscribeAsync(topic,
                        ps =>
                        {
                            ps.Register(topic, message =>
                            {
                                if (numReceived > MAX_RECEIVE_SIZE)
                                {
                                    ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "Pushed out 1000 tests in: "+(DateTime.Now - testStart).ToString() + " ");
                                }
                                else
                                {
                                    ++numReceived;
                                }
                            });
                        });
                }
            };
        }

        void OnMultiRegisterStress_LoginSuccess(ClientModels.LoginResult result)
        {
            pubSub = new PubSub();
            pubSub.OnConnect += () =>
            {
                // TODO: Subscribe A TON OF Topics, register 2 handlers for each, ?see if you can predict the order? pass test when all have been triggered (before a disconnect?)
                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "");
            };
        }

        void LoginFailure(PlayFab.PlayFabError error)
        {
            var testContext = ((UUnitTestContext)error.CustomData);
            testContext.Fail("The PubSub UnitTest " + testContext.Name + " Login Failed with the message: " + error.GenerateErrorReport());
        }

        public void LogMeIn(UUnitTestContext testContext)
        {
            ClientModels.LoginWithCustomIDRequest login = new ClientModels.LoginWithCustomIDRequest();
            login.CustomId = "PersistentSocketsUnityUnitTest" + Guid.NewGuid().ToString();
            login.CreateAccount = true;

            switch (testContext.Name)
            {
                case "PubSub_SubscribeAndRegister_Functionality":
                    PlayFabClientAPI.LoginWithCustomID(login, Functionality_LoginSuccess, LoginFailure, testContext);
                    break;
                case "PubSub_OnConnected_Functionality":
                    PlayFabClientAPI.LoginWithCustomID(login, OnConnected_LoginSuccess, LoginFailure, testContext);
                    break;
                case "PubSub_OnDisconnected_Functionality":
                    PlayFabClientAPI.LoginWithCustomID(login, OnDisconnected_LoginSuccess, LoginFailure, testContext);
                    break;
                case "PubSub_MultiHandler_Functionality":
                    PlayFabClientAPI.LoginWithCustomID(login, OnMultiHandler_LoginSuccess, LoginFailure, testContext);
                    break;
                case "PubSub_MultiTopic_Functionality":
                    PlayFabClientAPI.LoginWithCustomID(login, OnMultiTopic_LoginSuccess, LoginFailure, testContext);
                    break;
                case "PubSub_MultiTopic_Stress":
                    PlayFabClientAPI.LoginWithCustomID(login, OnMultiTopicPerf_LoginSuccess, LoginFailure, testContext);
                    break;
                default:
                    break;
            }
        }
        
        private Topic GetTestTopic(ClientModels.EntityKey entityKey)
        {
            return GetMultiTestTopic(entityKey, 0);
        }

        private Topic GetMultiTestTopic(ClientModels.EntityKey entityKey, int index)
        {
            _MyEntityKey = new PlayFab.EventsModels.EntityKey { Id = entityKey.Id, Type = entityKey.Type };
            return new Topic { EventNamespace = ns, Name = testName+index.ToString(), Entity = new Entity { Type = _MyEntityKey.Type, Id = _MyEntityKey.Id } };
        }
    }
}

#endif
