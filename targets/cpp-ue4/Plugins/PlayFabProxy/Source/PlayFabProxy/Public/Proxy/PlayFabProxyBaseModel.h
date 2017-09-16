
#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "GameFramework/PlayerController.h"
#include "Core/PlayFabError.h"
#include "PlayFabProxyBaseModel.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FEmptyPlayFabDelegate);

UCLASS(MinimalAPI)
class UPlayFabProxyBase : public UObject
{
	GENERATED_UCLASS_BODY()
public:
	UPROPERTY(BlueprintAssignable)
		FEmptyPlayFabDelegate OnFailure;

	// Called to trigger the actual action once the delegates have been bound
	UFUNCTION(BlueprintCallable, meta = (BlueprintInternalUseOnly = "true"), Category = "Play Fab")
		virtual void Activate();

protected:
	// The player controller triggering things
	TWeakObjectPtr<APlayerController> PlayerControllerWeakPtr;

	PlayFab::FPlayFabErrorDelegate ErrorDelegate;
	void OnErrorCallback(const PlayFab::FPlayFabError& ErrorResult);
};
