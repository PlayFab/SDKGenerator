#include "StdAfx.h"

#include <FlowSystem/Nodes/FlowBaseNode.h>
#include <platform_impl.h> // Resharper says this is unused, but it's still required in some less direct way

#include "PlayFabSdkGem.h"

Aws::String PlayFabSdk::PlayFabSdkGem::lastDebugMessage;

PlayFabSdk::PlayFabSdkGem::PlayFabSdkGem() { }
PlayFabSdk::PlayFabSdkGem::~PlayFabSdkGem() { }

void PlayFabSdk::PlayFabSdkGem::OnSystemEvent(ESystemEvent event, UINT_PTR wparam, UINT_PTR lparam)
{
    using namespace PlayFabSdk;

    switch (event)
    {
    case ESYSTEM_EVENT_FLOW_SYSTEM_REGISTER_EXTERNAL_NODES:
        RegisterFlowNodes();
        break;

    case ESYSTEM_EVENT_GAME_POST_INIT:
        if (gEnv->pGame->GetIGameFramework())
            gEnv->pGame->GetIGameFramework()->RegisterListener(this, "PlayFabSdk Gem", FRAMEWORKLISTENERPRIORITY_HUD);
        break;

    case ESYSTEM_EVENT_FULL_SHUTDOWN:
    case ESYSTEM_EVENT_FAST_SHUTDOWN:
        // Put your shutdown code here
        // Other Gems may have been shutdown already, but none will have destructed
        break;
    }
}

void PlayFabSdk::PlayFabSdkGem::OnPostUpdate(float fDeltaTime)
{
    if (lastDebugMessage.length() > 0)
    {
        float white[4] = { 1.f, 1.f, 1.f, 1.f };
        gEnv->pRenderer->Draw2dLabel(32.f, 32.f, 2.f, white, false, lastDebugMessage.c_str());
    }
}

GEM_REGISTER(PlayFabSdk::PlayFabSdkGem)
