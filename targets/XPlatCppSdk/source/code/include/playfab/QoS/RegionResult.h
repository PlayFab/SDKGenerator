#pragma once

#include <string>
#include <playfab/PlayFabMultiplayerDataModels.h>

namespace PlayFab
{
    namespace QoS
    {
        /// <summary>
        /// The result of pinging a datacenter.
        /// </summary>
        struct RegionResult
        {
        public:
            RegionResult(PlayFab::MultiplayerModels::AzureRegion region, int latencyMs, int errorCode);
            RegionResult() = delete;

            // The datacenter region
            PlayFab::MultiplayerModels::AzureRegion region;

            // Average latency to reach the data center
            int latencyMs;

            // Last error code recieved while pinging
            int errorCode;
        };
    }
}