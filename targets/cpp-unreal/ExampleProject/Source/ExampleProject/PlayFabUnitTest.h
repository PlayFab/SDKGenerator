#pragma once

class UPlayFabClientAPI;

#include "PlayFabUnitTest.generated.h"

UCLASS(Blueprintable, BlueprintType)
class UPlayFabUnitTest : public UObject
{
	GENERATED_UCLASS_BODY()

public:

	UFUNCTION(BlueprintCallable, Category = "PlayFab | Client | Authentication ")
	static UPlayFabClientAPI* UnitTestRegisterUser();
};
