#pragma once

#include "ModuleManager.h"


/**
* The public interface to this module.  In most cases, this interface is only public to sibling modules
* within this plugin.
*/
class IPlayFab : public IModuleInterface
{

public:

	/**
	* Singleton-like access to this module's interface.  This is just for convenience!
	* Beware of calling this during the shutdown phase, though.  Your module might have been unloaded already.
	*
	* @return Returns singleton instance, loading the module on demand if needed
	*/

	// Photon Ap Ids
	FString PhotonRealtimeAppId;
	FString PhotonTurnbasedAppId;
	FString PhotonChatAppId;
	int32 CloudScriptVersion;

	/** PlayFab URL */
	static const FString PlayFabURL;
	static const FString PlayFabLogicURL;

	static inline IPlayFab& Get()
	{
		return FModuleManager::LoadModuleChecked< IPlayFab >("PlayFab");
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

	inline FString getGameTitleId()
	{
		return GameTitleId;
	}

	inline FString getSessionTicket()
	{
		return SessionTicket;
	}

	inline FString getSecretApiKey()
	{
		return PlayFabApiSecretKey;
	}

	inline void setSessionTicket(FString NewSessionTicket)
	{
		SessionTicket = NewSessionTicket;
	}

	inline void setGameTitleId(FString NewGameTitleId)
	{
		GameTitleId = NewGameTitleId;
	}

	inline void setApiSecretKey(FString NewSecretApiKey)
	{
		PlayFabApiSecretKey = NewSecretApiKey;
	}

private:
	/** PlayFab App Id */
	FString GameTitleId;

	/** Session Ticket */
	FString SessionTicket;

	/** PlayFab Api Key */
	FString PlayFabApiSecretKey;
};

