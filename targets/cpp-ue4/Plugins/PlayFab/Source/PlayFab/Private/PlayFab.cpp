// Some copyright should be here...

#include "PlayFabPrivatePCH.h"
#include "PlayFab.h"

// Settings
#include "PlayFabRuntimeSettings.h"
#include "ISettingsModule.h"
#include "ISettingsSection.h"
#include "PlayFabSettings.h"

// Api's
#include "Core/PlayFabClientAPI.h"
#include "Core/PlayFabAdminAPI.h"
#include "Core/PlayFabServerAPI.h"
#include "Core/PlayFabMatchMakerAPI.h"


DEFINE_LOG_CATEGORY(LogPlayFab);

#define LOCTEXT_NAMESPACE "FPlayFabModule"

class FPlayFabModule : public IPlayFabModuleInterface
{
	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	// Settings
	void RegisterSettings();
	void UnregisterSettings();

	/** Callback for when the settings were saved. */
	bool HandleSettingsSaved();


	PlayFabClientPtr GetClientAPI() const override { return ClientAPI; };
	PlayFabServerPtr GetServerAPI() const override { return ServerAPI; };
	PlayFabMatchmakerPtr GetMatchmakerAPI() const override { return MatchMakerAPI; };
	PlayFabAdminPtr GetAdminAPI() const override { return AdminAPI; };
	
	


	PlayFabClientPtr ClientAPI;
	PlayFabServerPtr ServerAPI;
	PlayFabMatchmakerPtr MatchMakerAPI;
	PlayFabAdminPtr AdminAPI;
	
	
};


void FPlayFabModule::StartupModule()
{
	// This code will execute after your module is loaded into memory; the exact timing is specified in the .uplugin file per-module
	RegisterSettings();

	// copy the settings
	HandleSettingsSaved();

	// create the API
	ClientAPI = MakeShareable(new PlayFab::UPlayFabClientAPI());

#if WITH_SERVER_CODE
	ServerAPI = MakeShareable(new PlayFab::UPlayFabServerAPI());
	MatchMakerAPI = MakeShareable(new PlayFab::UPlayFabMatchmakerAPI());
	AdminAPI = MakeShareable(new PlayFab::UPlayFabAdminAPI());
#endif

}

void FPlayFabModule::ShutdownModule()
{
	// This function may be called during shutdown to clean up your module.  For modules that support dynamic reloading,
	// we call this function before unloading the module.
	UnregisterSettings();
}


void FPlayFabModule::RegisterSettings()
{
	if (ISettingsModule* SettingsModule = FModuleManager::GetModulePtr<ISettingsModule>("Settings"))
	{
		ISettingsSectionPtr SettingsSection = SettingsModule->RegisterSettings("Project", "Plugins", "PlayFab",
			LOCTEXT("PlayFabSettingsName", "PlayFab"),
			LOCTEXT("PlayFabSettingsDescription", "Configure the PlayFab plugin"),
			GetMutableDefault<UPlayFabRuntimeSettings>()
			);

		if (SettingsSection.IsValid())
		{
			SettingsSection->OnModified().BindRaw(this, &FPlayFabModule::HandleSettingsSaved);
		}
	}
}

void FPlayFabModule::UnregisterSettings()
{
	if (ISettingsModule* SettingsModule = FModuleManager::GetModulePtr<ISettingsModule>("Settings"))
	{
		SettingsModule->UnregisterSettings("Project", "Plugins", "PlayFab");
	}
}


bool FPlayFabModule::HandleSettingsSaved()
{
//	UE_LOG(LogPlayFab, Log, TEXT("bUseDevelopmentEnvironment %d"), GetDefault<UPlayFabRuntimeSettings>()->bUseDevelopmentEnvironment);
//	UE_LOG(LogPlayFab, Log, TEXT("DevelopmentEnvironmentURL %s"), *GetDefault<UPlayFabRuntimeSettings>()->DevelopmentEnvironmentURL);
//	UE_LOG(LogPlayFab, Log, TEXT("ProductionEnvironmentURL %s"), *GetDefault<UPlayFabRuntimeSettings>()->ProductionEnvironmentURL);
//	UE_LOG(LogPlayFab, Log, TEXT("TitleId %s"), *GetDefault<UPlayFabRuntimeSettings>()->TitleId);
//	UE_LOG(LogPlayFab, Log, TEXT("DeveloperSecretKey %s"), *GetDefault<UPlayFabRuntimeSettings>()->DeveloperSecretKey);

	// copy to the internal structure
	PlayFab::PlayFabSettings::serverURL = FString(); // flush the previous Server URL
	PlayFab::PlayFabSettings::useDevelopmentEnvironment = GetDefault<UPlayFabRuntimeSettings>()->bUseDevelopmentEnvironment;
	PlayFab::PlayFabSettings::developmentEnvironmentURL = GetDefault<UPlayFabRuntimeSettings>()->DevelopmentEnvironmentURL;
	PlayFab::PlayFabSettings::productionEnvironmentURL = GetDefault<UPlayFabRuntimeSettings>()->ProductionEnvironmentURL;
	PlayFab::PlayFabSettings::titleId = GetDefault<UPlayFabRuntimeSettings>()->TitleId;
	PlayFab::PlayFabSettings::developerSecretKey = GetDefault<UPlayFabRuntimeSettings>()->DeveloperSecretKey;

	return true;
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FPlayFabModule, PlayFab)
