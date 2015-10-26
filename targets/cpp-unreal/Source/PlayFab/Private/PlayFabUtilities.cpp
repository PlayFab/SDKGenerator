//////////////////////////////////////////////////////////////////////////////////////////////
// This is the utility functions for the PlayFab plugin
//////////////////////////////////////////////////////////////////////////////////////////////

#include "PlayFabPrivatePCH.h"
#include "PlayFabUtilities.h"

void UPlayFabUtilities::setPlayFabSettings(FString GameTitleId, FString PlayFabSecretApiKey, FString PhotonRealtimeAppId,
    FString PhotonTurnbasedAppId, FString PhotonChatAppId, int32 CloudScriptVersionInt)
{
    // Set the settings
    IPlayFab::Get().GameTitleId = GameTitleId;
    IPlayFab::Get().PlayFabApiSecretKey = PlayFabSecretApiKey;
    IPlayFab::Get().PhotonRealtimeAppId = PhotonRealtimeAppId;
    IPlayFab::Get().PhotonTurnbasedAppId = PhotonTurnbasedAppId;
    IPlayFab::Get().PhotonChatAppId = PhotonChatAppId;
    IPlayFab::Get().CloudScriptVersionInt = CloudScriptVersionInt;
}