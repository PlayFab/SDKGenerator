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

	/** Required for UOnlineBlueprintCallProxyBase */
	UPROPERTY(BlueprintAssignable)
		FOnPlayFabClientRequestCompleted OnPlayFabResponse;

	/** UOnlineBlueprintCallProxyBase interface */
	virtual void Activate() override;

	// RegisterPlayFabUser

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		static UPlayFabUnitTest* UnitTestRegisterPlayFabUser();

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		void OnSuccessRegisterPlayFabUser(FClientRegisterPlayFabUserResult result);

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		void OnFailureRegisterPlayFabUser(FPlayFabError error);

	// LoginWithEmailAddress

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		static UPlayFabUnitTest* UnitTestLoginWithEmailAddress();

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		void OnSuccessLoginWithEmailAddress(FClientLoginResult result);

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ", meta = (BlueprintInternalUseOnly = "true"))
		void OnFailureLoginWithEmailAddress(FPlayFabError error);

	// GetCloudScriptUrl

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Server-Side Cloud Script ", meta = (BlueprintInternalUseOnly = "true"))
		static UPlayFabUnitTest* UnitTestGetCloudScriptUrl();

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Server-Side Cloud Script ", meta = (BlueprintInternalUseOnly = "true"))
		void OnSuccessGetCloudScriptUrl(FClientGetCloudScriptUrlResult result);

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Server-Side Cloud Script ", meta = (BlueprintInternalUseOnly = "true"))
		void OnFailureGetCloudScriptUrl(FPlayFabError error);

	// RunCloudScript

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Server-Side Cloud Script ", meta = (BlueprintInternalUseOnly = "true"))
		static UPlayFabUnitTest* UnitTestRunCloudScript();

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Server-Side Cloud Script ", meta = (BlueprintInternalUseOnly = "true"))
		void OnSuccessRunCloudScript(FClientRunCloudScriptResult result);

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Server-Side Cloud Script ", meta = (BlueprintInternalUseOnly = "true"))
		void OnFailureRunCloudScript(FPlayFabError error);

private:

	UPlayFabClientAPI* _mClientAPI;
};
