#pragma once

#include "IPlayFabApiTestGem.h"
#include <aws/core/utils/memory/stl/AWSString.h>
#include <IGameFramework.h>

namespace PlayFabApiTest
{
    class PlayFabApiTestGem : public IPlayFabApiTestGem, IGameFrameworkListener
    {
        GEM_IMPLEMENT_WITH_INTERFACE(PlayFabApiTestGem, IPlayFabApiTestGem, 0x912be1e600e04f50, 0x9157feaddb7ab181)

    public:
        void OnSystemEvent(ESystemEvent event, UINT_PTR wparam, UINT_PTR lparam) override;
        void OnPostUpdate(float fDeltaTime) override;

        static Aws::String lastDebugMessage;
    };
} // namespace PlayFabApiTest
