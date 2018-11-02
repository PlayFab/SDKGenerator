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
        private Entity entity;

        private int testTicks = 0;
        private int playstreamTickDelay = 600;

        public override void SetUp(UUnitTestContext testContext)
        {
            // specific title id for relay test
            _previousTitleId = PlayFabSettings.TitleId;
            PlayFabSettings.TitleId = "70B02F89";
            PlayFabSettings.VerticalName = "spi";
        }

        public override void Tick(UUnitTestContext testContext)
        {
            ++testTicks;
            // this test will ping a write event continuously
            // THIS TEST THROTTLES THE TITLE. so you should NOT do this until you KNOW the object is open
            if (pubSub != null && pubSub.State == PersistentSocketState.Opened && testTicks % playstreamTickDelay == 0)
            {
                EventsModels.WriteEventsRequest req = new EventsModels.WriteEventsRequest();

                EventsModels.EventContents ec = new EventsModels.EventContents();

                ec.Entity = new EventsModels.EntityKey();
                ec.Entity.Id = _MyEntityKey.Id;
                ec.Entity.Type = _MyEntityKey.Type;
                ec.Name = "Ping_PubSub_Constructor";

                ec.EventNamespace = "com.playfab.events.PubSubTestNamespace";

                req.Events = new List<EventsModels.EventContents>();
                req.Events.Add(ec);

                PlayFabEventsAPI.WriteEvents(req, WriteEventSuccessful, WriteEventFail);
            }
        }

        public void WriteEventSuccessful(EventsModels.WriteEventsResponse response)
        {
            // check that we have assigned id's?
            // this will probably get called a few times before the hub connection opens
            // but once the hub connection opens it should immediatley start seeing something each Tick
        }

        public void WriteEventFail(PlayFabError error)
        {
            Debug.Log("Write Event Failed: " + error.ErrorMessage);
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
        public void TestPubSubConstruction(UUnitTestContext testContext)
        {
            ClientModels.LoginWithCustomIDRequest login = new ClientModels.LoginWithCustomIDRequest();
            login.CustomId = "PersistentSocketsUnityUnitTest" + Guid.NewGuid().ToString();
            login.CreateAccount = true;
            PlayFabClientAPI.LoginWithCustomID(login, LoginSuccess, LoginFailure, testContext);
        }

        void LoginSuccess(ClientModels.LoginResult result)
        {
            _MyEntityKey = new PlayFab.EventsModels.EntityKey { Id = result.EntityToken.Entity.Id, Type = result.EntityToken.Entity.Type };

            pubSub = new PubSub(message =>
            {
                ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, "PubSub construction successful");
            },
            new Topic { EventNamespace = "com.playfab.events.test", Name = "testevent", Entity = new Entity { Type = _MyEntityKey.Type, Id = _MyEntityKey.Id } });
        }

        void LoginFailure(PlayFab.PlayFabError error)
        {
            ((UUnitTestContext)error.CustomData).Fail("PubSub UnitTest Login Failed with the message: " + error.ErrorMessage);
        }
    }
}

#endif
