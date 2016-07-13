#include "StdAfx.h"
#include <platform_impl.h>
#include "PlayFabApiTestGem.h"
#include <FlowSystem/Nodes/FlowBaseNode.h>

Aws::String PlayFabApiTest::PlayFabApiTestGem::lastDebugMessage;

PlayFabApiTest::PlayFabApiTestGem::PlayFabApiTestGem() { }
PlayFabApiTest::PlayFabApiTestGem::~PlayFabApiTestGem() { }

void PlayFabApiTest::PlayFabApiTestGem::OnSystemEvent(ESystemEvent event, UINT_PTR wparam, UINT_PTR lparam)
{
    using namespace PlayFabApiTest;

    switch (event)
    {
    case ESYSTEM_EVENT_FLOW_SYSTEM_REGISTER_EXTERNAL_NODES:
        RegisterFlowNodes();
        break;

    case ESYSTEM_EVENT_GAME_POST_INIT:
        if (gEnv->pGame->GetIGameFramework())
            gEnv->pGame->GetIGameFramework()->RegisterListener(this, "PlayFabApiTestGem Gem", FRAMEWORKLISTENERPRIORITY_HUD);
        break;

    case ESYSTEM_EVENT_FULL_SHUTDOWN:
    case ESYSTEM_EVENT_FAST_SHUTDOWN:
        // Put your shutdown code here
        // Other Gems may have been shutdown already, but none will have destructed
        break;
    }
}

void PlayFabApiTest::PlayFabApiTestGem::OnPostUpdate(float fDeltaTime)
{
    if (lastDebugMessage.length() > 0)
    {
        float white[4] = { 1.f, 1.f, 1.f, 1.f };
        gEnv->pRenderer->Draw2dLabel(32.f, 32.f, 2.f, white, false, lastDebugMessage.c_str());
    }
}

GEM_REGISTER(PlayFabApiTest::PlayFabApiTestGem)
