#pragma once

class UPlayFabClientAPI;

#include "OnlineBlueprintCallProxyBase.h"
#include "PlayFabClientAPI.h"
#include "PlayFabClientModels.h"
#include "PlayFabUnitTest.generated.h"

UCLASS(Blueprintable, BlueprintType)
class UPlayFabUnitTest : public UOnlineBlueprintCallProxyBase
{
	GENERATED_UCLASS_BODY()

public:

	UPROPERTY(BlueprintAssignable)
		FOnPlayFabClientRequestCompleted OnPlayFabResponse;

	/** UOnlineBlueprintCallProxyBase interface */
	virtual void Activate() override;

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		static UPlayFabUnitTest* UnitTestRegisterUser();

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
	void OnSuccessUnitTestRegisterUser(FClientRegisterPlayFabUserResult result);

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
	void OnFailureUnitTestRegisterUser(FPlayFabError error);

private:

	UPlayFabClientAPI* _mClientAPI;
};
