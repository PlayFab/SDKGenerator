#pragma once

//////////////////////////////////////////////////////////////////////////////////////////////
// This is the utility functions for the PlayFab plugin
//////////////////////////////////////////////////////////////////////////////////////////////

#include "Kismet/BlueprintFunctionLibrary.h"
#include "PlayFabUtilities.generated.h"

class UPlayFabJsonObject;

UCLASS()
class UPlayFabUtilities : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:

    /** Setup the PlayFab settings used throughout the plugin. */
    UFUNCTION(BlueprintCallable, Category = "PlayFab | Settings")
    static void setPlayFabSettings(FString GameTitleId, FString PlayFabSecretApiKey = "", FString PhotonRealtimeAppId = "", FString PhotonTurnbasedAppId = "", FString PhotonChatAppId = "");
};
