// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#include "OnlineSubsystemPlayFabPrivatePCH.h"
#include "OnlineSubsystemPlayFab.h"


IOnlineSessionPtr FOnlineSubsystemPlayFab::GetSessionInterface() const
{
	return nullptr;
}

IOnlineFriendsPtr FOnlineSubsystemPlayFab::GetFriendsInterface() const
{
	return nullptr;
}

IOnlinePartyPtr FOnlineSubsystemPlayFab::GetPartyInterface() const
{
	return nullptr;
}

IOnlineGroupsPtr FOnlineSubsystemPlayFab::GetGroupsInterface() const
{
	return nullptr;
}

IOnlineSharedCloudPtr FOnlineSubsystemPlayFab::GetSharedCloudInterface() const
{
	return nullptr;
}

IOnlineUserCloudPtr FOnlineSubsystemPlayFab::GetUserCloudInterface() const
{
	return nullptr;
}

IOnlineUserCloudPtr FOnlineSubsystemPlayFab::GetUserCloudInterface(const FString& Key) const
{
	return nullptr;
}

IOnlineEntitlementsPtr FOnlineSubsystemPlayFab::GetEntitlementsInterface() const
{
	return nullptr;
};

IOnlineLeaderboardsPtr FOnlineSubsystemPlayFab::GetLeaderboardsInterface() const
{
	return nullptr;
}

IOnlineVoicePtr FOnlineSubsystemPlayFab::GetVoiceInterface() const
{
	return nullptr;
}

IOnlineExternalUIPtr FOnlineSubsystemPlayFab::GetExternalUIInterface() const
{
	return nullptr;
}

IOnlineTimePtr FOnlineSubsystemPlayFab::GetTimeInterface() const
{
	return nullptr;
}

IOnlineIdentityPtr FOnlineSubsystemPlayFab::GetIdentityInterface() const
{
	return nullptr;
}

IOnlineTitleFilePtr FOnlineSubsystemPlayFab::GetTitleFileInterface() const
{
	return nullptr;
}

IOnlineStorePtr FOnlineSubsystemPlayFab::GetStoreInterface() const
{
	return nullptr;
}

IOnlineEventsPtr FOnlineSubsystemPlayFab::GetEventsInterface() const
{
	return nullptr;
}

IOnlineAchievementsPtr FOnlineSubsystemPlayFab::GetAchievementsInterface() const
{
	return nullptr;
}

IOnlineSharingPtr FOnlineSubsystemPlayFab::GetSharingInterface() const
{
	return nullptr;
}

IOnlineUserPtr FOnlineSubsystemPlayFab::GetUserInterface() const
{
	return nullptr;
}

IOnlineMessagePtr FOnlineSubsystemPlayFab::GetMessageInterface() const
{
	return nullptr;
}

IOnlinePresencePtr FOnlineSubsystemPlayFab::GetPresenceInterface() const
{
	return nullptr;
}

IOnlineChatPtr FOnlineSubsystemPlayFab::GetChatInterface() const
{
	return nullptr;
}

IOnlineTurnBasedPtr FOnlineSubsystemPlayFab::GetTurnBasedInterface() const
{
	return nullptr;
}

bool FOnlineSubsystemPlayFab::Tick(float DeltaTime)
{
	if (!FOnlineSubsystemImpl::Tick(DeltaTime))
	{
		return false;
	}

// 	if (OnlineAsyncTaskThreadRunnable)
// 	{
// 		OnlineAsyncTaskThreadRunnable->GameTick();
// 	}
// 
// 	if (SessionInterface.IsValid())
// 	{
// 		SessionInterface->Tick(DeltaTime);
// 	}
// 
// 	if (VoiceInterface.IsValid())
// 	{
// 		VoiceInterface->Tick(DeltaTime);
// 	}

	return true;
}

bool FOnlineSubsystemPlayFab::Init()
{
	const bool bNullInit = true;

// 	if (bNullInit)
// 	{
// 		// Create the online async task thread
// 		OnlineAsyncTaskThreadRunnable = new FOnlineAsyncTaskManagerNull(this);
// 		check(OnlineAsyncTaskThreadRunnable);
// 		OnlineAsyncTaskThread = FRunnableThread::Create(OnlineAsyncTaskThreadRunnable, TEXT("OnlineAsyncTaskThreadNull"), 128 * 1024, TPri_Normal);
// 		check(OnlineAsyncTaskThread);
// 		UE_LOG_ONLINE(Verbose, TEXT("Created thread (ID:%d)."), OnlineAsyncTaskThread->GetThreadID());
// 
// 		SessionInterface = MakeShareable(new FOnlineSessionNull(this));
// 		LeaderboardsInterface = MakeShareable(new FOnlineLeaderboardsNull(this));
// 		IdentityInterface = MakeShareable(new FOnlineIdentityNull(this));
// 		AchievementsInterface = MakeShareable(new FOnlineAchievementsNull(this));
// 		VoiceInterface = MakeShareable(new FOnlineVoiceImpl(this));
// 		if (!VoiceInterface->Init())
// 		{
// 			VoiceInterface = nullptr;
// 		}
// 	}
// 	else
// 	{
// 		Shutdown();
// 	}

	return bNullInit;
}

bool FOnlineSubsystemPlayFab::Shutdown()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemPlayFab::Shutdown()"));

// 	if (OnlineAsyncTaskThread)
// 	{
// 		// Destroy the online async task thread
// 		delete OnlineAsyncTaskThread;
// 		OnlineAsyncTaskThread = nullptr;
// 	}
// 
// 	if (OnlineAsyncTaskThreadRunnable)
// 	{
// 		delete OnlineAsyncTaskThreadRunnable;
// 		OnlineAsyncTaskThreadRunnable = nullptr;
// 	}

#define DESTRUCT_INTERFACE(Interface) \
 	if (Interface.IsValid()) \
	 	{ \
 		ensure(Interface.IsUnique()); \
 		Interface = nullptr; \
	 	}

	// Destruct the interfaces
// 	DESTRUCT_INTERFACE(VoiceInterface);
// 	DESTRUCT_INTERFACE(AchievementsInterface);
// 	DESTRUCT_INTERFACE(IdentityInterface);
// 	DESTRUCT_INTERFACE(LeaderboardsInterface);
// 	DESTRUCT_INTERFACE(SessionInterface);

#undef DESTRUCT_INTERFACE

	return true;
}

FString FOnlineSubsystemPlayFab::GetAppId() const
{
	return TEXT("");
}

bool FOnlineSubsystemPlayFab::Exec(UWorld* InWorld, const TCHAR* Cmd, FOutputDevice& Ar)
{
	return false;
}

bool FOnlineSubsystemPlayFab::IsEnabled()
{
	return true;
}
