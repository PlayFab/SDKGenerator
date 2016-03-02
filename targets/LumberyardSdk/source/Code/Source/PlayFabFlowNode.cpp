#include "StdAfx.h"
#include "FlowBaseNode.h"
#include "PlayFabClientAPI.h"
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
            OutputPortConfig<SFlowSystemVoid>("OnResult", _HELP("Triggered when the api call succeeds.")),
            OutputPortConfig<SFlowSystemVoid>("OnError", _HELP("Triggered when the api call fails.")),
            { 0 }
        };
        config.sDescription = _HELP("PlayFab gem test node");
        config.pInputPorts = in_config;
        config.pOutputPorts = out_config;
        config.SetCategory(EFLN_APPROVED);
    }

    void LoginWithEmailAddressTest()
    {
        PlayFabSettings::titleId = "6195";

        ClientModels::LoginWithEmailAddressRequest request;
        request.Email = "paul@playfab.com";
        request.Password = "testPassword";
        request.TitleId = "6195";
        PlayFab::PlayFabClientAPI::LoginWithEmailAddress(request, OnLogin, OnSharedError);
    }

    static void OnLogin(const ClientModels::LoginResult& result, void* customData)
    {
        PlayFabSdk::PlayFabSdkGem::lastDebugMessage = "Successful login: " + result.SessionTicket;
    }

    static void OnSharedError(const PlayFabError& error, void* customData)
    {
        PlayFabSdk::PlayFabSdkGem::lastDebugMessage = "Error on last call: " + error.ErrorMessage;
    }

    virtual void ProcessEvent(EFlowEvent event, SActivationInfo* pActInfo)
    {
        switch (event)
        {
        case eFE_Activate:
            LoginWithEmailAddressTest();
            break;
        //case eFE_FinalActivate:
        }
    }
};
REGISTER_FLOW_NODE("PlayFab:PlayFabTest", CFlowNode_PlayFabTest);
