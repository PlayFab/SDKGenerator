#if !DISABLE_PLAYFABCLIENT_API && ENABLE_PLAYFABENTITY_API
using PlayFab.EntityModels;
using PlayFab.Internal;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace PlayFab.UUnit
{
    public class EntityApiTests : UUnitTestCase
    {
        private TestTitleDataLoader.TestTitleData testTitleData;

        // Test-data constants
        private const string TEST_OBJ_NAME = "testCounter";
        // Test variables
        private EntityKey _entityKey;
        private const string TEST_FILE_NAME = "testfile";
        private const string _testPayload = "{123456789}";
        private int _testInteger;

        public override void SetUp(UUnitTestContext testContext)
        {
            testTitleData = TestTitleDataLoader.LoadTestTitleData();

            // Verify all the inputs won't cause crashes in the tests
            var titleInfoSet = !string.IsNullOrEmpty(PlayFabSettings.TitleId);
            if (!titleInfoSet)
                testContext.Skip(); // We cannot do client tests if the titleId is not given

            if (testTitleData.extraHeaders != null)
                foreach (var pair in testTitleData.extraHeaders)
                    PlayFabHttp.GlobalHeaderInjection[pair.Key] = pair.Value;
        }

        public override void Tick(UUnitTestContext testContext)
        {
            // Do nothing, because the test finishes asynchronously
        }

        public override void ClassTearDown()
        {
            PlayFabEntityAPI.ForgetAllCredentials();
        }

        private void SharedErrorCallback(PlayFabError error)
        {
            // This error was not expected.  Report it and fail.
            ((UUnitTestContext)error.CustomData).Fail(error.GenerateErrorReport());
        }

        /// <summary>
        /// CLIENT/ENTITY API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        [UUnitTest]
        public void EntityClientLogin(UUnitTestContext testContext)
        {
            var loginRequest = new ClientModels.LoginWithCustomIDRequest
            {
                CustomId = PlayFabSettings.BuildIdentifier,
                CreateAccount = true,
            };
            PlayFabClientAPI.LoginWithCustomID(loginRequest, PlayFabUUnitUtils.ApiActionWrapper<ClientModels.LoginResult>(testContext, LoginCallback), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        private void LoginCallback(ClientModels.LoginResult result)
        {
            var testContext = (UUnitTestContext)result.CustomData;
            testContext.True(PlayFabClientAPI.IsClientLoggedIn(), "User login failed");
            testContext.EndTest(UUnitFinishState.PASSED, PlayFabSettings.TitleId + ", " + result.PlayFabId);
        }

        /// <summary>
        /// ENTITY API
        /// Verify that a client login can be converted into an entity token
        /// </summary>
        [UUnitTest]
        public void GetEntityToken(UUnitTestContext testContext)
        {
            var tokenRequest = new GetEntityTokenRequest();
            PlayFabEntityAPI.GetEntityToken(tokenRequest, PlayFabUUnitUtils.ApiActionWrapper<GetEntityTokenResponse>(testContext, GetTokenCallback), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        private void GetTokenCallback(GetEntityTokenResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            _entityKey = result.Entity;
            testContext.StringEquals(EntityTypes.title_player_account.ToString(), result.Entity.TypeString, "GetEntityToken EntityType not expected: " + result.Entity.TypeString);
            testContext.StringEquals(EntityTypes.title_player_account.ToString(), result.Entity.Type.ToString(), "GetEntityToken EntityType not expected: " + result.Entity.Type);

            testContext.True(PlayFabClientAPI.IsClientLoggedIn(), "Get Entity Token failed");
            testContext.EndTest(UUnitFinishState.PASSED, PlayFabSettings.TitleId + ", " + result.EntityToken);
        }

        /// <summary>
        /// ENTITY API
        /// Test a sequence of calls that modifies entity objects,
        ///   and verifies that the next sequential API call contains updated information.
        /// Verify that the object is correctly modified on the next call.
        /// </summary>
        [UUnitTest]
        public void ObjectApi(UUnitTestContext testContext)
        {
            var getRequest = new GetObjectsRequest { Entity = _entityKey, EscapeObject = true };
            PlayFabEntityAPI.GetObjects(getRequest, PlayFabUUnitUtils.ApiActionWrapper<GetObjectsResponse>(testContext, GetObjectCallback1), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        private void GetObjectCallback1(GetObjectsResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            _testInteger = 0; // Default if the data isn't present
            foreach (var eachObjPair in result.Objects)
                if (eachObjPair.Key == TEST_OBJ_NAME)
                    int.TryParse(eachObjPair.Value.EscapedDataObject, out _testInteger);

            _testInteger = (_testInteger + 1) % 100; // This test is about the Expected value changing - but not testing more complicated issues like bounds

            var updateRequest = new SetObjectsRequest
            {
                Entity = _entityKey,
                Objects = new List<SetObject> {
                    new SetObject{ ObjectName = TEST_OBJ_NAME, DataObject = _testInteger }
                }
            };
            PlayFabEntityAPI.SetObjects(updateRequest, PlayFabUUnitUtils.ApiActionWrapper<SetObjectsResponse>(testContext, UpdateObjectCallback), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        private void UpdateObjectCallback(SetObjectsResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            var getRequest = new GetObjectsRequest { Entity = _entityKey, EscapeObject = true };
            PlayFabEntityAPI.GetObjects(getRequest, PlayFabUUnitUtils.ApiActionWrapper<GetObjectsResponse>(testContext, GetObjectCallback2), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        private void GetObjectCallback2(GetObjectsResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            testContext.IntEquals(result.Objects.Count, 1, "Incorrect number of entity objects: " + result.Objects.Count);
            testContext.True(result.Objects.ContainsKey(TEST_OBJ_NAME), "Expected Test object not found: " + result.Objects.Keys.FirstOrDefault());
            var actualInteger = int.Parse(result.Objects[TEST_OBJ_NAME].EscapedDataObject);
            testContext.IntEquals(_testInteger, actualInteger, "Entity Object was not updated: " + actualInteger + "!=" + _testInteger);

            testContext.EndTest(UUnitFinishState.PASSED, actualInteger.ToString());
        }
        #region PUT_Verb_Test
        /// <summary>
        /// ENTITY PUT API
        /// Tests a sequence of calls that upload file to a server via PUT.
        /// Verifies that the file can be downloaded with the same information it's been saved with.
        /// </summary>

        [UUnitTest]
        public void PutApi(UUnitTestContext testContext)
        {
            var loginRequest = new ClientModels.LoginWithCustomIDRequest
            {
                CustomId = PlayFabSettings.BuildIdentifier,
                CreateAccount = true,
                LoginTitlePlayerAccountEntity = true,
            };

            PlayFabClientAPI.LoginWithCustomID(loginRequest, PlayFabUUnitUtils.ApiActionWrapper<ClientModels.LoginResult>(testContext, LoginCallbackPutTest), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        private void LoginCallbackPutTest(ClientModels.LoginResult result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            if (result.EntityToken != null)
            {
                PlayFab.EntityModels.EntityTypes entityType = (PlayFab.EntityModels.EntityTypes)(int)result.EntityToken.Entity.Type; // possible loss of data 

                _entityKey = new PlayFab.EntityModels.EntityKey
                {
                    Id = result.EntityToken.Entity.Id,
                    Type = entityType,
                    TypeString = result.EntityToken.Entity.TypeString
                };

                LoadFiles(testContext);
            }
            else
            {
                testContext.Fail("Entity Token is null!");
            }
        }
        private void LoadFiles(UUnitTestContext testContext)
        {
            var request = new GetFilesRequest
            {
                Entity = _entityKey
            };

            PlayFabEntityAPI.GetFiles(request, PlayFabUUnitUtils.ApiActionWrapper<EntityModels.GetFilesResponse>(testContext, OnGetFilesInfo), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        void OnGetFilesInfo(GetFilesResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;
            bool testFileFound = false;
            GetFileMetadata fileMetaData = new GetFileMetadata();

            foreach (var eachFilePair in result.Metadata)
            {
                if (eachFilePair.Key.Equals(TEST_FILE_NAME))
                {
                    testFileFound = true;

                    fileMetaData = eachFilePair.Value;
                    break; // this test only support one file
                }
            }

            if (!testFileFound)
            {
                UploadFile(testContext, TEST_FILE_NAME);
            }
            else
            {
                GetActualFile(testContext, fileMetaData);
            }
        }
        void GetActualFile(UUnitTestContext testContext, GetFileMetadata fileData)
        {
            PlayFabHttp.SimpleGetCall(fileData.DownloadUrl, PlayFabUUnitUtils.SimpleApiActionWrapper<byte[]>(testContext, TestFileContent),
                error =>
                {
                    testContext.Fail(error);
                });
        }
        void UploadFile(UUnitTestContext testContext, string fileName)
        {
            var request = new InitiateFileUploadsRequest
            {
                Entity = _entityKey,
                FileNames = new List<string>
                {
                    fileName
                },
            };

            PlayFabEntityAPI.InitiateFileUploads(request, PlayFabUUnitUtils.ApiActionWrapper<InitiateFileUploadsResponse>(testContext, OnInitFileUpload), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, OnInitFailed), testContext);
        }
        void DeleteFiles(UUnitTestContext testContext, List<string> fileName)
        {
            var request = new DeleteFilesRequest
            {
                Entity = _entityKey,
                FileNames = fileName,
            };

            PlayFabEntityAPI.DeleteFiles(request, result =>
            {
                testContext.EndTest(UUnitFinishState.PASSED, "File " + TEST_FILE_NAME + "was succesfully created and uploaded to server with PUT");
            },
            PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        void OnInitFailed(PlayFabError error)
        {
            var testContext = (UUnitTestContext)error.CustomData;

            if (error.Error == PlayFabErrorCode.EntityFileOperationPending)
            {
                var request = new AbortFileUploadsRequest
                {
                    Entity = _entityKey,
                    FileNames = new List<string> { TEST_FILE_NAME },
                };

                PlayFabEntityAPI.AbortFileUploads(request, PlayFabUUnitUtils.ApiActionWrapper<AbortFileUploadsResponse>(testContext, OnAbortFileUpload), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
            }
            else
            {
                if (error.CustomData != null)
                {
                    SharedErrorCallback(error);
                }
                else
                {
                    testContext.Fail(error.ErrorMessage);
                }
            }
        }
        void OnAbortFileUpload(AbortFileUploadsResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            UploadFile(testContext, TEST_FILE_NAME);
        }
        void OnInitFileUpload(InitiateFileUploadsResponse response)
        {
            var testContext = (UUnitTestContext)response.CustomData;
            var payload = Encoding.UTF8.GetBytes(_testPayload);

            PlayFabHttp.SimplePutCall(response.UploadDetails[0].UploadUrl,
                payload,
                PlayFabUUnitUtils.SimpleApiNoParamsActionWrapper(testContext, FinalizeUpload),
                error =>
                {
                    testContext.Fail(error);
                }
            );
        }
        void FinalizeUpload(UUnitTestContext testContext)
        {
            var request = new FinalizeFileUploadsRequest
            {
                Entity = _entityKey,
                FileNames = new List<string> { TEST_FILE_NAME },
            };
            PlayFabEntityAPI.FinalizeFileUploads(request, PlayFabUUnitUtils.ApiActionWrapper<FinalizeFileUploadsResponse>(testContext, OnUploadSuccess), PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedErrorCallback), testContext);
        }
        void OnUploadSuccess(FinalizeFileUploadsResponse result)
        {
            var testContext = (UUnitTestContext)result.CustomData;

            LoadFiles(testContext);
        }
        void TestFileContent(UUnitTestContext testContext, byte[] result)
        {
            var testFileData = Encoding.UTF8.GetString(result);

            testContext.True(testFileData.Equals(_testPayload));
            DeleteFiles(testContext, new List<string> { TEST_FILE_NAME });
        }
        #endregion
    }
}
#endif
