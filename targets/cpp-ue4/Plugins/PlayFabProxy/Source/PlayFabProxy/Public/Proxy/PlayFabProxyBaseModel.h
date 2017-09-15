#pragma once

#include "PlayFabProxyBaseModel.generated.h"

USTRUCT(BlueprintType, meta = (HasNativeBreak = "PlayFabProxy.PFBaseModelProxyLibrary.BreakBPPlayFabError", HasNativeMake = "PlayFabProxy.PFBaseModelProxyLibrary.MakeBPPlayFabError"))
struct FBPPlayFabError
{
	GENERATED_BODY()
public:
	FBPPlayFabError() {};
	FBPPlayFabError(PlayFab::FPlayFabError InData) : Data(InData) {};
	PlayFab::FPlayFabError Data;
};

UCLASS()
class UPFAdminProxyLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	// PlayFabError
	UFUNCTION(BlueprintPure, Category = "PlayFab|Admin", meta = (NativeMakeFunc))
	static FBPPlayFabError MakeBPPlayFabError(
		int32 InHttpCode;
        , FString InHttpStatus;
        , int32 InErrorCode;
        , FString InErrorName;
        , FString InErrorMessage;
	);
	UFUNCTION(BlueprintPure, Category = "PlayFab|Admin", meta = (NativeBreakFunc))
	static void BreakBPPlayFabError(
		const FBPPlayFabError& In
		, int32 OutHttpCode;
        , FString OutHttpStatus;
        , int32 OutErrorCode;
        , FString OutErrorName;
        , FString OutErrorMessage;
	);
};
