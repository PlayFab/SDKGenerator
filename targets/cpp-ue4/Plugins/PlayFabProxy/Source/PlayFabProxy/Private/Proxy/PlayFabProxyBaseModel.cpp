
#include "PlayFabProxyBaseModel.h"

UPlayFabProxyBase::UPlayFabProxyBase(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
    , ErrorDelegate(PlayFab::FPlayFabErrorDelegate::CreateUObject(this, &ThisClass::OnErrorCallback))
{
    SetFlags(RF_StrongRefOnFrame);
}

void UPlayFabProxyBase::Activate()
{
    
}

void UPlayFabProxyBase::OnErrorCallback(const PlayFab::FPlayFabError& ErrorResult)
{
    UE_LOG(LogPlayFabProxy, Error, TEXT("%s"), *ErrorResult.ErrorMessage);
    OnFailure.Broadcast();
}
