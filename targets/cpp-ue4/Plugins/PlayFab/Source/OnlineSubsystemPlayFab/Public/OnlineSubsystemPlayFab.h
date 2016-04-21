// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#pragma once

#include "OnlineSubsystem.h"
#include "OnlineSubsystemImpl.h"
#include "OnlineSubsystemPlayFabPackage.h"

/** Forward declarations of all interface classes */
// typedef TSharedPtr<class FOnlineSessionNull, ESPMode::ThreadSafe> FOnlineSessionNullPtr;
// typedef TSharedPtr<class FOnlineProfileNull, ESPMode::ThreadSafe> FOnlineProfileNullPtr;
// typedef TSharedPtr<class FOnlineFriendsNull, ESPMode::ThreadSafe> FOnlineFriendsNullPtr;
// typedef TSharedPtr<class FOnlineUserCloudNull, ESPMode::ThreadSafe> FOnlineUserCloudNullPtr;
// typedef TSharedPtr<class FOnlineLeaderboardsNull, ESPMode::ThreadSafe> FOnlineLeaderboardsNullPtr;
// typedef TSharedPtr<class FOnlineVoiceImpl, ESPMode::ThreadSafe> FOnlineVoiceImplPtr;
// typedef TSharedPtr<class FOnlineExternalUINull, ESPMode::ThreadSafe> FOnlineExternalUINullPtr;
// typedef TSharedPtr<class FOnlineIdentityNull, ESPMode::ThreadSafe> FOnlineIdentityNullPtr;
// typedef TSharedPtr<class FOnlineAchievementsNull, ESPMode::ThreadSafe> FOnlineAchievementsNullPtr;

/**
*	OnlineSubsystemPlayFab- Implementation of the online subsystem for PlayFab services
*/
class ONLINESUBSYSTEMPLAYFAB_API FOnlineSubsystemPlayFab :
    public FOnlineSubsystemImpl
{

public:

    virtual ~FOnlineSubsystemPlayFab()
    {
    }

    // IOnlineSubsystem

    virtual IOnlineSessionPtr GetSessionInterface() const override;
    virtual IOnlineFriendsPtr GetFriendsInterface() const override;
    virtual IOnlinePartyPtr GetPartyInterface() const override;
    virtual IOnlineGroupsPtr GetGroupsInterface() const override;
    virtual IOnlineSharedCloudPtr GetSharedCloudInterface() const override;
    virtual IOnlineUserCloudPtr GetUserCloudInterface() const override;
    virtual IOnlineUserCloudPtr GetUserCloudInterface(const FString& Key) const; // override??
    virtual IOnlineEntitlementsPtr GetEntitlementsInterface() const override;
    virtual IOnlineLeaderboardsPtr GetLeaderboardsInterface() const override;
    virtual IOnlineVoicePtr GetVoiceInterface() const override;
    virtual IOnlineExternalUIPtr GetExternalUIInterface() const override;
    virtual IOnlineTimePtr GetTimeInterface() const override;
    virtual IOnlineIdentityPtr GetIdentityInterface() const override;
    virtual IOnlineTitleFilePtr GetTitleFileInterface() const override;
    virtual IOnlineStorePtr GetStoreInterface() const override;
    virtual IOnlineEventsPtr GetEventsInterface() const override;
#if (ENGINE_MAJOR_VERSION == 4 && ENGINE_MINOR_VERSION >= 11)
    virtual IOnlineStoreV2Ptr GetStoreV2Interface() const override { return nullptr; }
    virtual IOnlinePurchasePtr GetPurchaseInterface() const override { return nullptr; }
#endif
    virtual IOnlineAchievementsPtr GetAchievementsInterface() const override;
    virtual IOnlineSharingPtr GetSharingInterface() const override;
    virtual IOnlineUserPtr GetUserInterface() const override;
    virtual IOnlineMessagePtr GetMessageInterface() const override;
    virtual IOnlinePresencePtr GetPresenceInterface() const override;
    virtual IOnlineChatPtr GetChatInterface() const override;
    virtual IOnlineTurnBasedPtr GetTurnBasedInterface() const override;

    virtual bool Init() override;
    virtual bool Shutdown() override;
    virtual FString GetAppId() const override;
    virtual bool Exec(class UWorld* InWorld, const TCHAR* Cmd, FOutputDevice& Ar) override;

    // FTickerObjectBase

    virtual bool Tick(float DeltaTime) override;

    // FOnlineSubsystemPlayFab

    /**
    * Is the PlayFab API available for use
    * @return true if PlayFab functionality is available, false otherwise
    */
    bool IsEnabled();

PACKAGE_SCOPE:

    /** Only the factory makes instances */
    FOnlineSubsystemPlayFab(FName InInstanceName)
        : FOnlineSubsystemImpl(InInstanceName)
        // 		, SessionInterface(NULL)
        // 		, VoiceInterface(NULL)
        // 		, LeaderboardsInterface(NULL)
        // 		, IdentityInterface(NULL)
        // 		, AchievementsInterface(NULL)
        // 		, OnlineAsyncTaskThreadRunnable(NULL)
        // 		, OnlineAsyncTaskThread(NULL)
    {}

    FOnlineSubsystemPlayFab()
        // 		: SessionInterface(NULL)
        // 		, VoiceInterface(NULL)
        // 		, LeaderboardsInterface(NULL)
        // 		, IdentityInterface(NULL)
        // 		, AchievementsInterface(NULL)
        // 		, OnlineAsyncTaskThreadRunnable(NULL)
        // 		, OnlineAsyncTaskThread(NULL)
    {}

private:

    // 	/** Interface to the session services */
    // 	FOnlineSessionNullPtr SessionInterface;
    // 
    // 	/** Interface for voice communication */
    // 	FOnlineVoiceImplPtr VoiceInterface;
    // 
    // 	/** Interface to the leaderboard services */
    // 	FOnlineLeaderboardsNullPtr LeaderboardsInterface;
    // 
    // 	/** Interface to the identity registration/auth services */
    // 	FOnlineIdentityNullPtr IdentityInterface;
    // 
    // 	/** Interface for achievements */
    // 	FOnlineAchievementsNullPtr AchievementsInterface;
    // 
    // 	/** Online async task runnable */
    // 	class FOnlineAsyncTaskManagerNull* OnlineAsyncTaskThreadRunnable;
    // 
    // 	/** Online async task thread */
    // 	class FRunnableThread* OnlineAsyncTaskThread;
};

typedef TSharedPtr<FOnlineSubsystemPlayFab, ESPMode::ThreadSafe> FOnlineSubsystemPlayFabPtr;

