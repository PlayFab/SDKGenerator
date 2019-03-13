using PlayFab;
using PlayFab.ClientModels;
using PlayFab.UUnit;

public class PlayFabAuthServiceTests : UUnitTestCase
{
    public override void Tick(UUnitTestContext testContext)
    {
        // No async work needed
    }

    private PlayFabAuthService _emailAuthService;

    [UUnitTest]
    public void EmailPasswordLoginTest(UUnitTestContext testContext)
    {
        const string email = "LoginTest@gmail.com";
        const string password = "395847";
        const string username = "LoginTest";

        _emailAuthService = new PlayFabAuthService();
        _emailAuthService.Email = email;
        _emailAuthService.Password = password;
        _emailAuthService.Username = username;

        _emailAuthService.OnLoginSuccess += success =>
        {
            testContext.True(!string.IsNullOrEmpty(success.PlayFabId));
            testContext.NotNull(_emailAuthService.AuthenticationContext);
            testContext.EndTest(UUnitFinishState.PASSED, "Email & password auth success. " + success.PlayFabId);
        };
        _emailAuthService.OnPlayFabError += error =>
        {
            testContext.EndTest(UUnitFinishState.FAILED, "Email & password auth failed with error: " + error.GenerateErrorReport());
        };
        _emailAuthService.OnDisplayAuthentication += () =>
        {
            testContext.EndTest(UUnitFinishState.FAILED, "Email & password auth failed.");
        };
        _emailAuthService.Authenticate(AuthTypes.EmailAndPassword);
    }

    [UUnitTest]
    public void LinkDeviceToAccount(UUnitTestContext testContext)
    {
        _emailAuthService.ForceLink = true;
        _emailAuthService.OnPlayFabLink += (auth, error) =>
        {
            if (error == null) testContext.EndTest(UUnitFinishState.PASSED, "Link deviceId success.");
            else testContext.EndTest(UUnitFinishState.FAILED, "Link deviceId failed with error: " + error.GenerateErrorReport());
        };
        _emailAuthService.Link(AuthTypes.Silent);
    }

    [UUnitTest]
    public void TestLinkDeviceIdStatus(UUnitTestContext testContext)
    {
        PlayFabClientAPI.GetAccountInfo(new GetAccountInfoRequest
        {
            AuthenticationContext = _emailAuthService.AuthenticationContext
        }, response =>
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            testContext.True(response.AccountInfo.AndroidDeviceInfo.AndroidDeviceId.Equals(PlayFabSettings.DeviceUniqueIdentifier), "Android deviceID not match!");
#elif UNITY_IPHONE || UNITY_IOS && !UNITY_EDITOR
            testContext.True(response.AccountInfo.IosDeviceInfo.IosDeviceId.Equals(PlayFabSettings.DeviceUniqueIdentifier), "iOS deviceID not match!");
#else
            testContext.True(response.AccountInfo.CustomIdInfo.CustomId.Equals(PlayFabSettings.DeviceUniqueIdentifier), "customId not match!");
#endif
            testContext.EndTest(UUnitFinishState.PASSED, "DeviceId successfully linked!");
        }, error =>
        {
            testContext.EndTest(UUnitFinishState.FAILED, "GetAccountInfo error: " + error.ErrorMessage);
        });
    }

    [UUnitTest]
    public void LoginWithDeviceId(UUnitTestContext testContext)
    {
        var silentAuth = new PlayFabAuthService();
        silentAuth.OnLoginSuccess += success =>
        {
            testContext.True(_emailAuthService.AuthenticationContext.PlayFabId == success.PlayFabId);
            testContext.EndTest(UUnitFinishState.PASSED, "Silent auth success with playFabId: " + success.PlayFabId);
        };
        silentAuth.OnPlayFabError += error =>
        {
            testContext.EndTest(UUnitFinishState.FAILED, "Silent auth failed with error: " + error.ErrorMessage);
        };
        silentAuth.Authenticate(AuthTypes.Silent);
    }

    [UUnitTest]
    public void TestUnLinkDeviceId(UUnitTestContext testContext)
    {
        _emailAuthService.OnPlayFabUnlink += (auth, error) =>
        {
            if(error == null) testContext.EndTest(UUnitFinishState.PASSED, "UnLink deviceId success.");
            else testContext.EndTest(UUnitFinishState.FAILED, "UnLink deviceId failed with error: " + error.ErrorMessage);
        };
        _emailAuthService.Unlink(AuthTypes.Silent);
    }

    [UUnitTest]
    public void TestUnlinkedDeviceStatus(UUnitTestContext testContext)
    {
        PlayFabClientAPI.GetAccountInfo(new GetAccountInfoRequest
        {
            AuthenticationContext = _emailAuthService.AuthenticationContext
        }, response =>
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            testContext.True(response.AccountInfo.AndroidDeviceInfo == null, "Android deviceID should be null!");
#elif UNITY_IPHONE || UNITY_IOS && !UNITY_EDITOR
            testContext.True(response.AccountInfo.IosDeviceInfo == null, "iOS deviceID should be null!");
#else
            testContext.True(response.AccountInfo.CustomIdInfo == null, "customID should be null!");
#endif
            testContext.EndTest(UUnitFinishState.PASSED, "DeviceId successfully unlinked!");
        }, error =>
        {
            testContext.EndTest(UUnitFinishState.FAILED, "GetAccountInfo error: " + error.ErrorMessage);
        });
    }

    [UUnitTest]
    public void TestSilentLoginAfterUnlink(UUnitTestContext testContext)
    {
        var silentAuth = new PlayFabAuthService();
        silentAuth.OnLoginSuccess += success =>
        {
            testContext.True(success.PlayFabId != _emailAuthService.AuthenticationContext.PlayFabId, "Silent auth and email auth playFabIds is match!");
            testContext.EndTest(UUnitFinishState.PASSED, "Silent auth completed as expected. New playFabId: " + success.PlayFabId);
        };
        silentAuth.OnPlayFabError += error =>
        {
            testContext.EndTest(UUnitFinishState.PASSED, "Silent auth abort with error: " + error.Error.ToString());
        };
        silentAuth.Authenticate(AuthTypes.Silent);
    }
}