//////////////////////////////////////////////////////////////////////////////////////////////
// This is the utility functions for the PlayFab plugin
//////////////////////////////////////////////////////////////////////////////////////////////

#include "PlayFabUtilities.h"
#include "PlayFabPrivate.h"

void UPlayFabUtilities::setPlayFabSettings(FString GameTitleId, FString PlayFabSecretApiKey, FString PhotonRealtimeAppId, FString PhotonTurnbasedAppId, FString PhotonChatAppId)
{
    // Set the settings
    IPlayFab::Get().GameTitleId = GameTitleId;
    IPlayFab::Get().PlayFabApiSecretKey = PlayFabSecretApiKey;
    IPlayFab::Get().PhotonRealtimeAppId = PhotonRealtimeAppId;
    IPlayFab::Get().PhotonTurnbasedAppId = PhotonTurnbasedAppId;
    IPlayFab::Get().PhotonChatAppId = PhotonChatAppId;
}
