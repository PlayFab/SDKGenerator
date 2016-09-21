// Fill out your copyright notice in the Description page of Project Settings.

#include "ExampleProject.h"
#include "PlayFabApiTests.h"

DEFINE_LOG_CATEGORY(LogPlayFab); // This is a separate project from the PlayFab plugin, so this has to be re-defined in this project - This is not standard, but these tests should log as playfab, even from another project

                                 /*
                                 * ==== Test Suite ====
                                 */
FString PlayFabApiTestSuite::playFabId;
FString PlayFabApiTestSuite::characterId;


/*
* ==== LoginWithEmailAddress ====
*/
PlayFabApiTest_LoginWithEmail::PlayFabApiTest_LoginWithEmail(const FString& email, const FString& password)
{
    this->email = email;
    this->password = password;
}

bool PlayFabApiTest_LoginWithEmail::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FLoginWithEmailAddressRequest request;
        request.Email = email;
        request.Password = password;

        clientAPI->LoginWithEmailAddress(request
            , PlayFab::UPlayFabClientAPI::FLoginWithEmailAddressDelegate::CreateRaw(this, &PlayFabApiTest_LoginWithEmail::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_LoginWithEmail::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_LoginWithEmail::OnSuccess(const PlayFab::ClientModels::FLoginResult& Result) const
{
    UE_LOG(LogPlayFab, Error, TEXT("LoginWithEmailAddress Succeeded where it should have failed"));
}

void PlayFabApiTest_LoginWithEmail::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    if (ErrorResult.ErrorMessage.Find(TEXT("password")) == -1) // Check that we correctly received a notice about invalid password
    {
        UE_LOG(LogPlayFab, Error, TEXT("Non-password error with login"));
    }
}



/*
* ==== LoginWithCustomID ====
*/
PlayFabApiTest_LoginWithCustomID::PlayFabApiTest_LoginWithCustomID(const FString& customId)
{
    this->customId = customId;
}

bool PlayFabApiTest_LoginWithCustomID::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FLoginWithCustomIDRequest request;
        request.CustomId = customId;
        request.CreateAccount = true;

        clientAPI->LoginWithCustomID(request
            , PlayFab::UPlayFabClientAPI::FLoginWithCustomIDDelegate::CreateRaw(this, &PlayFabApiTest_LoginWithCustomID::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_LoginWithCustomID::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_LoginWithCustomID::OnSuccess(const PlayFab::ClientModels::FLoginResult& Result) const
{
    PlayFabApiTestSuite::playFabId = Result.PlayFabId;
    UE_LOG(LogPlayFab, Log, TEXT("PlayFab login successful: %s, %s"), *PlayFabApiTestSuite::playFabId, *customId);
}

void PlayFabApiTest_LoginWithCustomID::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("Login failed"));
}


/*
* ==== LoginWithAdvertisingId ====
*/
PlayFabApiTest_LoginWithAdvertisingId::PlayFabApiTest_LoginWithAdvertisingId(const FString& customId)
{
    this->tickCounter = 0;
    this->customId = customId;
}

bool PlayFabApiTest_LoginWithAdvertisingId::Update()
{
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();
        clientAPI->SetAdvertId("Android_Id", "PlayFabTestId");

        PlayFab::ClientModels::FLoginWithCustomIDRequest request;
        request.CustomId = customId;
        request.CreateAccount = true;

        clientAPI->LoginWithCustomID(request
            , PlayFab::UPlayFabClientAPI::FLoginWithCustomIDDelegate::CreateRaw(this, &PlayFabApiTest_LoginWithAdvertisingId::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_LoginWithAdvertisingId::OnError)
        );
    }

    tickCounter += 1;
    bool success = clientAPI->AdvertIdSuccessful();
    bool failure = tickCounter > 300 && !success;
    if (failure)
        UE_LOG(LogPlayFab, Error, TEXT("advertisingId not submitted properly"));

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0 && (failure || success);
}

void PlayFabApiTest_LoginWithAdvertisingId::OnSuccess(const PlayFab::ClientModels::FLoginResult& Result) const
{
    PlayFabApiTestSuite::playFabId = Result.PlayFabId;
    UE_LOG(LogPlayFab, Log, TEXT("PlayFab login successful: %s, %s"), *PlayFabApiTestSuite::playFabId, *customId);
}

void PlayFabApiTest_LoginWithAdvertisingId::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("LoginWithAdvertisingId Failed: %s"), *(ErrorResult.ErrorMessage));
}


/*
* ==== GetUserData ====
*/
PlayFabApiTest_GetUserData::PlayFabApiTest_GetUserData(const FString& TEST_DATA_KEY_1, const FString& TEST_DATA_KEY_2, int expectedValue = -1)
{
    this->TEST_DATA_KEY_1 = TEST_DATA_KEY_1;
    this->TEST_DATA_KEY_2 = TEST_DATA_KEY_2;

    this->expectedValue = expectedValue;
}

bool PlayFabApiTest_GetUserData::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FGetUserDataRequest request;

        clientAPI->GetUserData(request
            , PlayFab::UPlayFabClientAPI::FGetUserDataDelegate::CreateRaw(this, &PlayFabApiTest_GetUserData::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GetUserData::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GetUserData::OnSuccess(const PlayFab::ClientModels::FGetUserDataResult& Result) const
{
    int actualValue = -1;

    const PlayFab::ClientModels::FUserDataRecord* target = Result.Data.Find(TEST_DATA_KEY_1);
    if (target != nullptr)
        actualValue = FCString::Atoi(*(target->Value));

    if (expectedValue != -1 && expectedValue != actualValue)
    {
        // If I know what value I'm expecting, and I did not get it, log an error
        UE_LOG(LogPlayFab, Error, TEXT("GetUserData: Update value did not match new value %d!=%d"), expectedValue, actualValue);
    }
    else if (expectedValue != -1 && expectedValue == actualValue)
    {
        // If I know what value I'm expecting, and I got it, test passed, exit
        CheckTimestamp(target->LastUpdated); // If the value was updated correctly, check the timestamp
        UE_LOG(LogPlayFab, Log, TEXT("GetUserData Success"));
    }
    else if (expectedValue == -1)
    {
        // If I don't know what value I was expecting, Call Update with (actualValue + 1)
        actualValue = (actualValue + 1) % 100;
        ADD_LATENT_AUTOMATION_COMMAND(PlayFabApiTest_UpdateUserData(TEST_DATA_KEY_1, TEST_DATA_KEY_2, actualValue));
    }
}

void PlayFabApiTest_GetUserData::CheckTimestamp(const FDateTime& updateTime) const
{
    FDateTime utcNow = FDateTime::UtcNow();
    FTimespan delta = FTimespan(0, 5, 0);
    FDateTime minTest = utcNow - delta;
    FDateTime maxTest = utcNow + delta;

    if (minTest <= updateTime && updateTime <= maxTest)
    {
        UE_LOG(LogPlayFab, Log, TEXT("GetUserData: LastUpdated timestamp parsed as expected"));
    }
    else
    {
        UE_LOG(LogPlayFab, Error, TEXT("GetUserData: LastUpdated timestamp was not parsed correctly"));
    }
}

void PlayFabApiTest_GetUserData::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GetUserData Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== UpdateUserData ====
*/
PlayFabApiTest_UpdateUserData::PlayFabApiTest_UpdateUserData(const FString& TEST_DATA_KEY_1, const FString& TEST_DATA_KEY_2, int updateValue)
{
    this->TEST_DATA_KEY_1 = TEST_DATA_KEY_1;
    this->TEST_DATA_KEY_2 = TEST_DATA_KEY_2;

    this->updateValue = updateValue;
}

bool PlayFabApiTest_UpdateUserData::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        FString strUpdateValue;
        strUpdateValue.AppendInt(updateValue);

        PlayFab::ClientModels::FUpdateUserDataRequest request;
        request.Data.Add(TEST_DATA_KEY_1, strUpdateValue);

        clientAPI->UpdateUserData(request
            , PlayFab::UPlayFabClientAPI::FUpdateUserDataDelegate::CreateRaw(this, &PlayFabApiTest_UpdateUserData::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_UpdateUserData::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_UpdateUserData::OnSuccess(const PlayFab::ClientModels::FUpdateUserDataResult& Result) const
{
    // Update is always followed by another get w/ verification
    ADD_LATENT_AUTOMATION_COMMAND(PlayFabApiTest_GetUserData(TEST_DATA_KEY_1, TEST_DATA_KEY_2, updateValue));
}

void PlayFabApiTest_UpdateUserData::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("UpdateUserData Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== GetPlayerStatistics ====
*/
PlayFabApiTest_GetPlayerStatistics::PlayFabApiTest_GetPlayerStatistics(const FString& TEST_STAT_NAME, int expectedValue = -1)
{
    this->TEST_STAT_NAME = TEST_STAT_NAME;

    this->expectedValue = expectedValue;
}

bool PlayFabApiTest_GetPlayerStatistics::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FGetPlayerStatisticsRequest request;
        clientAPI->GetPlayerStatistics(
            request,
            PlayFab::UPlayFabClientAPI::FGetPlayerStatisticsDelegate::CreateRaw(this, &PlayFabApiTest_GetPlayerStatistics::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GetPlayerStatistics::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GetPlayerStatistics::OnSuccess(const PlayFab::ClientModels::FGetPlayerStatisticsResult& Result) const
{
    int actualValue = -1000;
    for (int i = 0; i < Result.Statistics.Num(); i++)
        if (Result.Statistics[i].StatisticName == TEST_STAT_NAME)
            actualValue = Result.Statistics[i].Value;

    if (expectedValue != -1 && expectedValue != actualValue)
    {
        UE_LOG(LogPlayFab, Error, TEXT("GetPlayerStatistics: Update value did not match new value"));
    }
    else if (expectedValue != -1 && expectedValue == actualValue)
    {
        UE_LOG(LogPlayFab, Log, TEXT("GetPlayerStatistics Success"));
    }
    else if (expectedValue == -1)
    {
        // Call Update with (actualValue + 1)
        actualValue = (actualValue + 1) % 100;
        ADD_LATENT_AUTOMATION_COMMAND(PlayFabApiTest_UpdatePlayerStatistics(TEST_STAT_NAME, actualValue));
    }
}

void PlayFabApiTest_GetPlayerStatistics::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GetPlayerStatistics Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== UpdatePlayerStatistics ====
*/
PlayFabApiTest_UpdatePlayerStatistics::PlayFabApiTest_UpdatePlayerStatistics(const FString& TEST_STAT_NAME, int updateValue)
{
    this->TEST_STAT_NAME = TEST_STAT_NAME;

    this->updateValue = updateValue;
}

bool PlayFabApiTest_UpdatePlayerStatistics::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FUpdatePlayerStatisticsRequest request;
        PlayFab::ClientModels::FStatisticUpdate statUpdate;
        statUpdate.StatisticName = TEST_STAT_NAME;
        statUpdate.Value = updateValue;
        request.Statistics.Add(statUpdate);

        clientAPI->UpdatePlayerStatistics(request
            , PlayFab::UPlayFabClientAPI::FUpdatePlayerStatisticsDelegate::CreateRaw(this, &PlayFabApiTest_UpdatePlayerStatistics::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_UpdatePlayerStatistics::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_UpdatePlayerStatistics::OnSuccess(const PlayFab::ClientModels::FUpdatePlayerStatisticsResult& Result) const
{
    // Update is always followed by another get w/ verification
    ADD_LATENT_AUTOMATION_COMMAND(PlayFabApiTest_GetPlayerStatistics(TEST_STAT_NAME, updateValue));
}

void PlayFabApiTest_UpdatePlayerStatistics::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("UpdatePlayerStatistics Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== GetAllUsersCharacters ====
*/
PlayFabApiTest_GetAllUsersCharacters::PlayFabApiTest_GetAllUsersCharacters(const FString& CHAR_NAME, const FString& CHAR_TEST_TYPE, bool expectSuccess = false)
{
    this->CHAR_NAME = CHAR_NAME;
    this->CHAR_TEST_TYPE = CHAR_TEST_TYPE;

    this->expectSuccess = expectSuccess;
}

bool PlayFabApiTest_GetAllUsersCharacters::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FListUsersCharactersRequest request;

        clientAPI->GetAllUsersCharacters(request
            , PlayFab::UPlayFabClientAPI::FGetAllUsersCharactersDelegate::CreateRaw(this, &PlayFabApiTest_GetAllUsersCharacters::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GetAllUsersCharacters::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GetAllUsersCharacters::OnSuccess(const PlayFab::ClientModels::FListUsersCharactersResult& Result) const
{
    bool characterFound = false;
    for (auto eachCharacter : Result.Characters)
    {
        if (eachCharacter.CharacterName == CHAR_NAME)
        {
            characterFound = true;
            PlayFabApiTestSuite::characterId = eachCharacter.CharacterId;
        }
    }

    if (!characterFound && expectSuccess)
    {
        UE_LOG(LogPlayFab, Error, TEXT("GetAllUsersCharacters: Could not find required character"));
    }
    else if (characterFound)
    {
        UE_LOG(LogPlayFab, Log, TEXT("GetAllUsersCharacters Success"));
    }
    else if (!characterFound)
    {
        ADD_LATENT_AUTOMATION_COMMAND(PlayFabApiTest_GrantCharacterToUser(CHAR_NAME, CHAR_TEST_TYPE));
    }
}

void PlayFabApiTest_GetAllUsersCharacters::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GetAllUsersCharacters Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== GrantCharacterToUser ====
*/
PlayFabApiTest_GrantCharacterToUser::PlayFabApiTest_GrantCharacterToUser(const FString& CHAR_NAME, const FString& CHAR_TEST_TYPE)
{
    this->CHAR_NAME = CHAR_NAME;
    this->CHAR_TEST_TYPE = CHAR_TEST_TYPE;
}

bool PlayFabApiTest_GrantCharacterToUser::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!serverAPI.IsValid())
    {
        serverAPI = IPlayFabModuleInterface::Get().GetServerAPI();

        PlayFab::ServerModels::FGrantCharacterToUserRequest request;
        request.PlayFabId = PlayFabApiTestSuite::playFabId;
        request.CharacterName = CHAR_NAME;
        request.CharacterType = CHAR_TEST_TYPE;

        serverAPI->GrantCharacterToUser(request
            , PlayFab::UPlayFabServerAPI::FGrantCharacterToUserDelegate::CreateRaw(this, &PlayFabApiTest_GrantCharacterToUser::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GrantCharacterToUser::OnError)
        );
    }

    // Return when the api call is resolved
    return serverAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GrantCharacterToUser::OnSuccess(const PlayFab::ServerModels::FGrantCharacterToUserResult& Result) const
{
    // Update is always followed by another get w/ verification
    ADD_LATENT_AUTOMATION_COMMAND(PlayFabApiTest_GetAllUsersCharacters(CHAR_NAME, CHAR_TEST_TYPE, true));
}

void PlayFabApiTest_GrantCharacterToUser::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GrantCharacterToUser Failed: %s (%s, %s, %s)"), *(ErrorResult.GenerateErrorReport()), *PlayFabApiTestSuite::playFabId, *CHAR_NAME, *CHAR_TEST_TYPE);
}

/*
* ==== GetLeaderboard Client ====
*/
PlayFabApiTest_GetLeaderboardC::PlayFabApiTest_GetLeaderboardC(const FString& TEST_STAT_NAME)
{
    this->TEST_STAT_NAME = TEST_STAT_NAME;
}

bool PlayFabApiTest_GetLeaderboardC::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FGetLeaderboardRequest request;
        request.MaxResultsCount = 3;
        request.StatisticName = TEST_STAT_NAME;

        clientAPI->GetLeaderboard(request
            , PlayFab::UPlayFabClientAPI::FGetLeaderboardDelegate::CreateRaw(this, &PlayFabApiTest_GetLeaderboardC::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GetLeaderboardC::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GetLeaderboardC::OnSuccess(const PlayFab::ClientModels::FGetLeaderboardResult& Result) const
{
    int count = Result.Leaderboard.Num();

    if (count > 0)
    {
        UE_LOG(LogPlayFab, Log, TEXT("GetLeaderboard Succeeded"));
    }
    else
    {
        UE_LOG(LogPlayFab, Error, TEXT("GetLeaderboard found zero results."));
    }
}

void PlayFabApiTest_GetLeaderboardC::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GetLeaderboard Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== GetLeaderboard Server ====
*/
PlayFabApiTest_GetLeaderboardS::PlayFabApiTest_GetLeaderboardS(const FString& TEST_STAT_NAME)
{
    this->TEST_STAT_NAME = TEST_STAT_NAME;
}

bool PlayFabApiTest_GetLeaderboardS::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!serverAPI.IsValid())
    {
        serverAPI = IPlayFabModuleInterface::Get().GetServerAPI();

        PlayFab::ServerModels::FGetLeaderboardRequest request;
        request.MaxResultsCount = 3;
        request.StatisticName = TEST_STAT_NAME;

        serverAPI->GetLeaderboard(request
            , PlayFab::UPlayFabServerAPI::FGetLeaderboardDelegate::CreateRaw(this, &PlayFabApiTest_GetLeaderboardS::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GetLeaderboardS::OnError)
        );
    }

    // Return when the api call is resolved
    return serverAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GetLeaderboardS::OnSuccess(const PlayFab::ServerModels::FGetLeaderboardResult& Result) const
{
    int count = Result.Leaderboard.Num();

    if (count > 0)
    {
        UE_LOG(LogPlayFab, Log, TEXT("GetLeaderboard Succeeded"));
    }
    else
    {
        UE_LOG(LogPlayFab, Error, TEXT("GetLeaderboard found zero results."));
    }
}

void PlayFabApiTest_GetLeaderboardS::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GetLeaderboard Failed: %s"), *(ErrorResult.ErrorMessage));
}

/*
* ==== GetAccountInfo ====
*/
PlayFabApiTest_GetAccountInfo::PlayFabApiTest_GetAccountInfo()
{
}

bool PlayFabApiTest_GetAccountInfo::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FGetAccountInfoRequest request;

        clientAPI->GetAccountInfo(request
            , PlayFab::UPlayFabClientAPI::FGetAccountInfoDelegate::CreateRaw(this, &PlayFabApiTest_GetAccountInfo::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_GetAccountInfo::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_GetAccountInfo::OnSuccess(const PlayFab::ClientModels::FGetAccountInfoResult& Result) const
{
    auto origination = Result.AccountInfo->TitleInfo->Origination.mValue; // C++ can't really do anything with this once fetched
    UE_LOG(LogPlayFab, Log, TEXT("GetAccountInfo Succeeded"));
}

void PlayFabApiTest_GetAccountInfo::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("GetAccountInfo Failed: %s"), *(ErrorResult.ErrorMessage));
}


/*
* ==== ExecuteCloudScript ====
*/
PlayFabApiTest_ExecuteCloudScript::PlayFabApiTest_ExecuteCloudScript(const FString& functionName)
{
    this->functionName = functionName;
}

bool PlayFabApiTest_ExecuteCloudScript::Update()
{
    // Initialize, setup the call, and wait for the result
    if (!clientAPI.IsValid())
    {
        clientAPI = IPlayFabModuleInterface::Get().GetClientAPI();

        PlayFab::ClientModels::FExecuteCloudScriptRequest request;
        request.FunctionName = functionName;

        clientAPI->ExecuteCloudScript(request
            , PlayFab::UPlayFabClientAPI::FExecuteCloudScriptDelegate::CreateRaw(this, &PlayFabApiTest_ExecuteCloudScript::OnSuccess)
            , PlayFab::FPlayFabErrorDelegate::CreateRaw(this, &PlayFabApiTest_ExecuteCloudScript::OnError)
        );
    }

    // Return when the api call is resolved
    return clientAPI->GetPendingCalls() == 0;
}

void PlayFabApiTest_ExecuteCloudScript::OnSuccess(const PlayFab::ClientModels::FExecuteCloudScriptResult& Result) const
{
    UE_LOG(LogPlayFab, Log, TEXT("ExecuteCloudScript Succeeded"));
}

void PlayFabApiTest_ExecuteCloudScript::OnError(const PlayFab::FPlayFabError& ErrorResult) const
{
    UE_LOG(LogPlayFab, Error, TEXT("ExecuteCloudScript Failed: %s"), *(ErrorResult.ErrorMessage));
}
