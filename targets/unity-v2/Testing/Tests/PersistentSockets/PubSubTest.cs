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

        public override void Tick(UUnitTestContext testContext)
        {
            // No async work needed?
            // should this be a theoretical HubConnection SendAsync call to print a message out in the test?
        }
        public override void TearDown(UUnitTestContext testContext)
        {
        }

        public override void ClassTearDown()
        {
        }

        [UUnitTest]
        public void TestPubSubConstruction(UUnitTestContext testContext)
        {
            //_testContext = testContext;
            Debug.Log("Starting PubSub UnitTest");

            // specific title id for relay test
            _previousTitleId = PlayFabSettings.TitleId;
            PlayFabSettings.TitleId = "70B02F89";
            PlayFabSettings.VerticalName = "spi-relay";

            ClientModels.LoginWithCustomIDRequest login = new ClientModels.LoginWithCustomIDRequest();
            login.CustomId = "ToddIsTryingToTestPersistentSocketsInUnity" + Guid.NewGuid().ToString();
            login.CreateAccount = true;
            PlayFabClientAPI.LoginWithCustomID(login, LoginSuccess, LoginFailure, testContext);
        }

        void LoginSuccess(ClientModels.LoginResult result)
        {
            // This needs to be set in PlayFabSettings?... worst case scenario we pass this through the constructor
            _MyEntityKey = new PlayFab.EventsModels.EntityKey { Id = result.EntityToken.Entity.Id, Type = result.EntityToken.Entity.Type };

            // TODO: construct a PubSub object here
            PubSub pubSub = new PubSub(message =>
            {
                Console.WriteLine(message.ToString());
                Debug.Log("Received a Message: " + message);
            }, new Topic { EventNamespace = "com.playfab.events.test", Name = "testevent", Entity = new Entity { Type = _MyEntityKey.Type, Id = _MyEntityKey.Id } }); // will this Entity conflict?

            // see if you can print some messages out from here
            pubSub.PumpMessagesTest();

            Debug.Log("Ending PubSub UnitTest");
            ((UUnitTestContext) result.CustomData).EndTest(UUnitFinishState.PASSED, "PubSub construction successful****************************************************************************************************");
            PlayFabSettings.TitleId = _previousTitleId;
            PlayFabSettings.VerticalName = null;
        }

        void LoginFailure(PlayFab.PlayFabError error)
        {
            Debug.Log("PubSub UnitTest Login Failed with the message: " + error.ErrorMessage);
        }
    }
}

#endif
