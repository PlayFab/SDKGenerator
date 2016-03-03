#include "StdAfx.h"
#include "FlowBaseNode.h"
#include "PlayFabClientAPI.h"
//#include "PlayFabServerAPI.h"
#include "PlayFabSettings.h"
#include "PlayFabSdkGem.h"

using namespace PlayFab;

class CFlowNode_PlayFabTest : public CFlowBaseNode<eNCT_Instanced>
{
public:
    CFlowNode_PlayFabTest(SActivationInfo* pActInfo)
    {
    }

    virtual IFlowNodePtr Clone(SActivationInfo *pActInfo)
    {
        return new CFlowNode_PlayFabTest(pActInfo);
    }

    virtual void GetMemoryUsage(ICrySizer* s) const
    {
        s->Add(*this);
    }

    virtual void GetConfiguration(SFlowNodeConfig& config)
    {
        static const SInputPortConfig in_config[] = {
            InputPortConfig<SFlowSystemVoid>("Activate", _HELP("Run the PlayFabApiTests")),
            { 0 }
        };
        static const SOutputPortConfig out_config[] = {
            // Could probably put real api types here
            OutputPortConfig<Aws::String>("Summary", _HELP("A summary of the tests (once complete)")),
            { 0 }
        };
        config.sDescription = _HELP("PlayFab gem test node");
        config.pInputPorts = in_config;
        config.pOutputPorts = out_config;
        config.SetCategory(EFLN_APPROVED);
    }

    virtual void ProcessEvent(EFlowEvent event, SActivationInfo* pActInfo)
    {
        switch (event)
        {
        case eFE_Activate:
            RunTestSuite();
            break;
            //case eFE_FinalActivate:
        }
    }
private:
    static Aws::String activeTestName;
    static Aws::String outputSummary;

    // A bunch of constants: TODO: load these from testTitleData.json
    static Aws::String titleId;
    static Aws::String developerSecretKey;
    static Aws::String titleCanUpdateSettings;
    static Aws::String userName;
    static Aws::String userEmail;
    static Aws::String userPassword;
    static Aws::String characterName;

    static void RunTestSuite()
    {
        ClassSetup();
        PlayFabSdk::PlayFabSdkGem::lastDebugMessage = outputSummary;
    }

    static void ClassSetup()
    {
        outputSummary._Grow(10000, false);

        // TODO: Read from testTitleData.json here
        titleId = "6195";
        developerSecretKey = "TKHKZYUQF1AFKYOKPKAZJ1HRNQY61KJZC6E79ZF9YYXR9Q74CT";
        titleCanUpdateSettings = "true";
        userName = "paul";
        userEmail = "paul@playfab.com";
        userPassword = "testPassword";
        characterName = "Ragnar";

        PlayFabSettings::titleId = titleId;
    }

    static void OnSharedError(const PlayFabError& error, void* customData)
    {
        outputSummary += "FAILURE: " + activeTestName + " - " + error.ErrorMessage;
        activeTestName = "";
    }

    /// <summary>
    /// CLIENT API
    /// Try to deliberately log in with an inappropriate password,
    ///   and verify that the error displays as expected.
    /// </summary>
    static void InvalidLogin()
    {
        ClientModels::LoginWithEmailAddressRequest request;
        request.Email = userEmail;
        request.Password = userPassword + "INVALID";
        PlayFabClientAPI::LoginWithEmailAddress(request, InvalidLoginSuccess, InvalidLoginFail);
    }
    static void InvalidLoginSuccess(const ClientModels::LoginResult& result, void* customData)
    {
        outputSummary += "FAILURE: InvalidLoginSuccess - Expected login to fail";
        activeTestName = "";
    }
    static void InvalidLoginFail(const PlayFabError& error, void* customData)
    {
        if (error.ErrorMessage.find("Password") != -1)
            outputSummary += "SUCCESS: InvalidLoginSuccess";
        else
            outputSummary += "FAILURE: InvalidLoginSuccess - Password error message not found: " + error.ErrorMessage;
        activeTestName = "";
    }

    /// <summary>
    /// CLIENT API
    /// Try to deliberately register a character with an invalid email and password.
    ///   Verify that errorDetails are populated correctly.
    /// </summary>
    static void InvalidRegistration()
    {
        ClientModels::RegisterPlayFabUserRequest request;
        request.Username = userName;
        request.Email = "x";
        request.Password = userPassword + "INVALID";
        PlayFabClientAPI::RegisterPlayFabUser(request, InvalidRegistrationSuccess, InvalidRegistrationFail);
    }
    static void InvalidRegistrationSuccess(const ClientModels::RegisterPlayFabUserResult& result, void* customData)
    {
        outputSummary += "FAILURE: InvalidLoginSuccess - Expected registration to fail";
        activeTestName = "";
    }
    static void InvalidRegistrationFail(const PlayFabError& error, void* customData)
    {
        bool foundPasswordMsg = false, foundEmailMsg;
        Aws::String expectedEmailMsg = "Email address is not valid.";
        Aws::String expectedPasswordMsg = "Password must be between";

        auto end = error.ErrorDetails.end();
        for (auto it = error.ErrorDetails.begin(); it != end; it++)
        {
            it;
        }

        if (error.ErrorMessage.find("Password") != -1)
            outputSummary += "SUCCESS: InvalidLoginSuccess";
        else
            outputSummary += "FAILURE: InvalidLoginSuccess - Password error message not found: " + error.ErrorMessage;
        activeTestName = "";
    }

    static void LoginOrRegister()
    {
        ClientModels::LoginWithEmailAddressRequest request;
        request.Email = userEmail;
        request.Password = userPassword + "INVALID";
        PlayFabClientAPI::LoginWithEmailAddress(request, OnLoginOrRegister, OnSharedError);
    }
    static void OnLoginOrRegister(const ClientModels::LoginResult& result, void* customData)
    {
        PlayFabSdk::PlayFabSdkGem::lastDebugMessage = "Successful login: " + result.SessionTicket;
    }
};
// C++ Static vars
Aws::String CFlowNode_PlayFabTest::activeTestName;
Aws::String CFlowNode_PlayFabTest::outputSummary;
Aws::String CFlowNode_PlayFabTest::titleId;
Aws::String CFlowNode_PlayFabTest::developerSecretKey;
Aws::String CFlowNode_PlayFabTest::titleCanUpdateSettings;
Aws::String CFlowNode_PlayFabTest::userName;
Aws::String CFlowNode_PlayFabTest::userEmail;
Aws::String CFlowNode_PlayFabTest::userPassword;
Aws::String CFlowNode_PlayFabTest::characterName;

REGISTER_FLOW_NODE("PlayFab:PlayFabTest", CFlowNode_PlayFabTest);
