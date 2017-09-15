
#include "PlayFabProxyBaseModel.h"
#include "PlayFabProxy.h"
#include "Core/PlayFabError.h"

FBPPlayFabError UPFAdminProxyLibrary::MakeBPPlayFabError(
	int32 InHttpCode;
	, FString InHttpStatus;
	, int32 InErrorCode;
	, FString InErrorName;
	, FString InErrorMessage;
	)
{
	FBPPlayFabError Out = FBPPlayFabError();
    Out.Data.HttpCode = InHttpCode;
	Out.Data.HttpStatus = InHttpStatus;
	Out.Data.ErrorCode = InErrorCode;
	Out.Data.ErrorName = InErrorName;
	Out.Data.ErrorMessage = InErrorMessage;

	return Out;
}

void UPFAdminProxyLibrary::BreakBPPlayFabError(
	const FBPPlayFabError& In
	, int32 OutHttpCode;
	, FString OutHttpStatus;
	, int32 OutErrorCode;
	, FString OutErrorName;
	, FString OutErrorMessage;
	)
{
	OutHttpCode = In.Data.HttpCode;
	OutHttpStatus = In.Data.HttpStatus;
	OutErrorCode = In.Data.ErrorCode;
	OutErrorName = In.Data.ErrorName;
	OutErrorMessage = In.Data.ErrorMessage;

}
