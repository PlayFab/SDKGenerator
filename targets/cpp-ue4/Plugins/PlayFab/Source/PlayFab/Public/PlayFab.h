// Some copyright should be here...

#pragma once

#include "ModuleManager.h"

DECLARE_LOG_CATEGORY_EXTERN(LogPlayFab, Log, All);

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
};
