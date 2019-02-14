#include "pch.h"
// Copyright (C) Microsoft Corporation. All rights reserved.
//
// This is a small application that demonstrates how to integrate with the GSDK
// for PlayFab Multiplayer Servers 2.0. To run it, you will need to follow the
// instructions for Local Debugging and set up our Local Agent:
// https://api.playfab.com/docs/tutorials/landing-tournaments/multiplayer-servers-2.0/debugging-playfab-multiplayer-platform-integration-locally
#include <playfab/PlayFabGameServerSDK.h>

#include <chrono>
#include <thread>

void inShutdown()
{
    printf("GSDK is shutting me down!!!\n");
    std::this_thread::sleep_for(std::chrono::seconds(5));
    std::exit(0);
}

bool isHealthy()
{
    return false;
}

void maintenanceScheduled(tm t)
{
#if _WIN32
    time_t local = _mkgmtime(&t);
    double delta = difftime(local, time(NULL));
    struct tm buf;
    char str[26];
    gmtime_s(&buf, &local);
    asctime_s(str, sizeof str, &buf);
    printf("UTC:   %s", str);
    localtime_s(&buf, &local);
    asctime_s(str, sizeof str, &buf);
    printf("local: %s", str);
    printf("delta: %f", delta);
#else // Linux
    time_t local = timegm(&t);
    double delta = difftime(local, time(NULL));
    printf("UTC:   %s\n", asctime(gmtime(&local)));
    printf("local: %s\n", asctime(localtime(&local)));
    printf("delta: %f\n", delta);
#endif
}

int main()
{
    printf("Starting!\n");
    try
    {
        PlayFab::GSDK::PlayFabGameServerSDK::start();
        PlayFab::GSDK::PlayFabGameServerSDK::registerShutdownCallback(&inShutdown);
        PlayFab::GSDK::PlayFabGameServerSDK::registerHealthCallback(&isHealthy);
        PlayFab::GSDK::PlayFabGameServerSDK::registerMaintenanceCallback(&maintenanceScheduled);

        // Test grabbing config
        printf(" Config before Active.\n");
        for (auto config : PlayFab::GSDK::PlayFabGameServerSDK::getConfigSettings())
        {
            printf("%s: %s\n", config.first.c_str(), config.second.c_str());
        }

        printf("\tStanding by!\n");
        if (PlayFab::GSDK::PlayFabGameServerSDK::readyForPlayers())
        {
            printf("Game on!\n");
            printf(" Config after Active.\n");
            for (auto config : PlayFab::GSDK::PlayFabGameServerSDK::getConfigSettings())
            {
                printf("%s: %s\n", config.first.c_str(), config.second.c_str());
            }

            std::vector<PlayFab::GSDK::GameServerConnectedPlayer> players;
            players.push_back(PlayFab::GSDK::GameServerConnectedPlayer("player1"));
            players.push_back(PlayFab::GSDK::GameServerConnectedPlayer("player2"));
            PlayFab::GSDK::PlayFabGameServerSDK::updateConnectedPlayers(players);

            printf("Logs directory is: %s\n", PlayFab::GSDK::PlayFabGameServerSDK::getLogsDirectory().c_str());
        }
        else
        {
            printf("Not allocated. Server is being shut down.\n");
        }
    }
    catch (const std::exception &ex)
    {
        printf("Problem initializing GSDK: %s\n", ex.what());
    }

    printf("Press enter to exit the program.\n");
    getchar();

    return 0;
}
