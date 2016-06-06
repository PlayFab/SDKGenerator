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

    // PlayFab Advertising-related values
    FString AdvertisingIdType; // Set this to the appropriate AD_TYPE_X constant below
    FString AdvertisingIdValue; // Set this to corresponding device value

    // DisableAdvertising is provided for completeness, but changing it is not suggested
    // Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
    bool DisableAdvertising = false;
    const FString AD_TYPE_IDFA = TEXT("Idfa");
    const FString AD_TYPE_ANDROID_ID = TEXT("Android_Id");

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
    inline void setGameTitleId(FString NewGameTitleId)
    {
        GameTitleId = NewGameTitleId;
    }

    inline bool IsClientLoggedIn()
    {
        return SessionTicket.Len() > 0;
    }
    inline FString getSessionTicket()
    {
        return SessionTicket;
    }
    inline void setSessionTicket(FString NewSessionTicket)
    {
        SessionTicket = NewSessionTicket;
    }

    inline FString getSecretApiKey()
    {
        return PlayFabApiSecretKey;
    }
    inline void setApiSecretKey(FString NewSecretApiKey)
    {
        PlayFabApiSecretKey = NewSecretApiKey;
    }

    inline int32 GetPendingCallCount()
    {
        int32 output;
        pendingCallLock.Lock();
        output = pendingCalls;
        pendingCallLock.Unlock();
        return output;
    }
    inline void ModifyPendingCallCount(int32 delta)
    {
        pendingCallLock.Lock();
        pendingCalls += delta;
        pendingCallLock.Unlock();
    }

private:
    FString GameTitleId; // PlayFab TitleId
    FString SessionTicket; // PlayFab client session ticket
    FString PlayFabApiSecretKey; // PlayFab DeveloperSecretKey
    FCriticalSection pendingCallLock;
    int32 pendingCalls;
};
