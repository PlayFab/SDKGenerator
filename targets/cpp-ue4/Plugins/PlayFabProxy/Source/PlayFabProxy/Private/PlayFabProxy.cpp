
#include "PlayFabProxy.h"

DEFINE_LOG_CATEGORY(LogPlayFabProxy);

#define LOCTEXT_NAMESPACE "FPlayFabProxyModule"

class FPlayFabProxyModule : public IPlayFabProxyModuleInterface
{
    /** IModuleInterface implementation */
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;
};

void FPlayFabProxyModule::StartupModule()
{
    // This code will execute after your module is loaded into memory; the exact timing is specified in the .uplugin file per-module
}

void FPlayFabProxyModule::ShutdownModule()
{
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FPlayFabProxyModule, PlayFabProxy)
