// Some copyright should be here...

#include "PlayFabPrivatePCH.h"

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

	virtual PlayFabClientPtr GetClientAPI() const override { return ClientAPI; };
	virtual PlayFabServerPtr GetServerAPI() const override { return ServerAPI; };
	virtual PlayFabMatchmakerPtr GetMatchmakerAPI() const override { return MatchMakerAPI; };
	virtual PlayFabAdminPtr GetAdminAPI() const override { return AdminAPI; };
	
	

	virtual const FPlayFabInstanceParameters& GetInstanceParameters() const override
	{
		return InstanceParameters;
	}

	PlayFabClientPtr ClientAPI;
	PlayFabServerPtr ServerAPI;
	PlayFabMatchmakerPtr MatchMakerAPI;
	PlayFabAdminPtr AdminAPI;
	
	FPlayFabInstanceParameters InstanceParameters;
	
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

	InstanceParameters.Parse();

#if WITH_EDITOR
	// override instance parameter, if we have the secret key from the ini file 
	FString IniSecretKey;
	if (GConfig->GetString(TEXT("PlayFabDebug"), TEXT("PlayFabSecretKey"), IniSecretKey, GEngineIni))
	{
		PlayFab::PlayFabSettings::developerSecretKey = IniSecretKey;
	}
#endif

	// only enable these API if we are coming from a valid dedicated server instance
	if (PlayFab::PlayFabSettings::developerSecretKey.IsEmpty() == false)
	{
		ServerAPI = MakeShareable(new PlayFab::UPlayFabServerAPI());
		MatchMakerAPI = MakeShareable(new PlayFab::UPlayFabMatchmakerAPI());
		AdminAPI = MakeShareable(new PlayFab::UPlayFabAdminAPI());
	}
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
	// copy to the internal structure
	PlayFab::PlayFabSettings::serverURL = FString(); // flush the previous Server URL
	PlayFab::PlayFabSettings::useDevelopmentEnvironment = GetDefault<UPlayFabRuntimeSettings>()->bUseDevelopmentEnvironment;
	PlayFab::PlayFabSettings::developmentEnvironmentURL = GetDefault<UPlayFabRuntimeSettings>()->DevelopmentEnvironmentURL;
	PlayFab::PlayFabSettings::productionEnvironmentURL = GetDefault<UPlayFabRuntimeSettings>()->ProductionEnvironmentURL;
	PlayFab::PlayFabSettings::titleId = GetDefault<UPlayFabRuntimeSettings>()->TitleId;

#if !(UE_BUILD_SHIPPING || UE_BUILD_TEST)
	// override titleId, so we can easily switch between environment from the client perspective
	FString overridenTitleId;
	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_TITLE_ID="), overridenTitleId))
	{
		PlayFab::PlayFabSettings::titleId = overridenTitleId;
	}
#endif // !(UE_BUILD_SHIPPING || UE_BUILD_TEST)

	return true;
}


void FPlayFabInstanceParameters::Parse()
{
	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_GAME_ID="), GameID))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_GAME_ID %s"), *GameID);
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_GAME_ID"));
	}

	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_GAME_BUILD_VERSION="), GameBuildVersion))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_GAME_BUILD_VERSION %s"), *GameBuildVersion);
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_GAME_BUILD_VERSION"));
	}

	if(FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_GAMEMODE="), GameMode))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_GAMEMODE %s"), *GameMode);
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_GAMEMODE"));
	}

	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_SERVER_HOST_DOMAIN="), ServerHostDomain))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_SERVER_HOST_DOMAIN %s"), *ServerHostDomain);
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_SERVER_HOST_DOMAIN"));
	}

	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_SERVER_HOST_PORT="), ServerHostPort))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_SERVER_HOST_PORT %s"), *ServerHostPort);
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_SERVER_HOST_PORT"));
	}

	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_SERVER_HOST_REGION="), ServerHostRegion))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_SERVER_HOST_REGION %s"), *ServerHostRegion);
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_SERVER_HOST_REGION"));
	}

	if (FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_API_ENDPOINT="), APIEndpoint))
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_API_ENDPOINT %s"), *APIEndpoint);
		// copy value to the config options
		PlayFab::PlayFabSettings::serverURL = APIEndpoint;
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_API_ENDPOINT"));
	}

	if( FParse::Value(FCommandLine::Get(), TEXT("PLAYFAB_TITLE_SECRET_KEY="), TitleSecretKey) )
	{
		UE_LOG(LogPlayFab, Log, TEXT("Found PLAYFAB_TITLE_SECRET_KEY %s"), *TitleSecretKey);
		// copy value to the config options
		PlayFab::PlayFabSettings::developerSecretKey = TitleSecretKey;
	}
	else
	{
		UE_LOG(LogPlayFab, Warning, TEXT("Unable to parse PLAYFAB_TITLE_SECRET_KEY"));
	}

}


#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FPlayFabModule, PlayFab)