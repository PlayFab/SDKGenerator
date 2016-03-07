#pragma once

#include "IPlayFabSdkGem.h"
#include "IGameFramework.h"
#include <aws/core/utils/memory/stl/AWSString.h>

//#include <IFlowSystem.h>
//#include "../FlowSystem.h"
//#include "../FlowSerialize.h"
//#include <IActorSystem.h>
//#include <FlowSystem/LambdaFlowGraph/BaseLambdaFlowNode.h>
//#include <sstream>

namespace PlayFabSdk
{
    class PlayFabSdkGem : public IPlayFabSdkGem, IGameFrameworkListener
    {
        GEM_IMPLEMENT_WITH_INTERFACE(PlayFabSdkGem, IPlayFabSdkGem, 0x6d932d60b2564e18, 0xa4cad0b6a4cbf5b8)

    public:
        void OnSystemEvent(ESystemEvent event, UINT_PTR wparam, UINT_PTR lparam) override;
        void OnPostUpdate(float fDeltaTime) override;

        static Aws::String lastDebugMessage;
    };
} // namespace PlayFabSdk
