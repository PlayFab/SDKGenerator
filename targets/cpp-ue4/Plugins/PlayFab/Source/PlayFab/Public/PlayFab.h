// Some copyright should be here...

#pragma once

#include "ModuleManager.h"

// forward declaration of classes
namespace PlayFab
{
	class UPlayFabClientAPI;
	class UPlayFabServerAPI;
	class UPlayFabMatchmakerAPI;
	class UPlayFabAdminAPI;
}

typedef TSharedPtr<class PlayFab::UPlayFabClientAPI> PlayFabClientPtr;
typedef TSharedPtr<class PlayFab::UPlayFabServerAPI> PlayFabServerPtr;
typedef TSharedPtr<class PlayFab::UPlayFabMatchmakerAPI> PlayFabMatchmakerPtr;
typedef TSharedPtr<class PlayFab::UPlayFabAdminAPI> PlayFabAdminPtr;

// a helper for dedicated server command line parsing
class FPlayFabInstanceParameters
{
public:
	// PLAYFAB_GAME_ID =>  a unique numeric identifier for the server instance being created
	// PLAYFAB_GAME_BUILD_VERSION => a string specifying the build version (the same string you specified for the Build ID in PlayFab)
	// PLAYFAB_GAMEMODE => a string value for the specific game mode being started – defined in ModifyMatchmakerGameModes
	// PLAYFAB_SERVER_HOST_DOMAIN => a string value of the URI of the AWS host
	// PLAYFAB_SERVER_HOST_PORT => a numeric value of the port for communication with this game instance
	// PLAYFAB_SERVER_HOST_REGION => a string value of the region in which this instance is operating
	// PLAYFAB_API_ENDPOINT => a string value of the base URI for the endpoint this instance must use for any API calls to the PlayFab service – as described in the Web API documentation
	// PLAYFAB_TITLE_SECRET_KEY => a string value of the title secret key the server must use for PlayFab API calls which use the secret key for authentication

	void Parse();

	FString GameID;
	FString GameBuildVersion;
	FString GameMode;
	FString ServerHostDomain;
	FString ServerHostPort;
	FString ServerHostRegion;
	FString APIEndpoint;
	FString TitleSecretKey;
};


/**
* The public interface to this module.  In most cases, this interface is only public to sibling modules
* within this plugin.
*/
class IPlayFabModuleInterface : public IModuleInterface
{
public:

	/**
	* Singleton-like access to this module's interface.  This is just for convenience!
	* Beware of calling this during the shutdown phase, though.  Your module might have been unloaded already.
	*
	* @return Returns singleton instance, loading the module on demand if needed
	*/
	static inline IPlayFabModuleInterface& Get()
	{
		return FModuleManager::LoadModuleChecked< IPlayFabModuleInterface >("PlayFab");
	}

	/**
	* Checks to see if this module is loaded and ready.  It is only valid to call Get() if IsAvailable() returns true.
	*
	* @return True if the module is loaded and ready to use
	*/
	static inline bool IsAvailable()
	{
		return FModuleManager::Get().IsModuleLoaded("PlayFab");
	}

	virtual PlayFabClientPtr GetClientAPI() const = 0;
	virtual PlayFabServerPtr GetServerAPI() const = 0;
	virtual PlayFabMatchmakerPtr GetMatchmakerAPI() const = 0;
	virtual PlayFabAdminPtr GetAdminAPI() const = 0;
	// get the command line parameters from the dedicated server instance
	virtual const FPlayFabInstanceParameters& GetInstanceParameters() const = 0;
	
};