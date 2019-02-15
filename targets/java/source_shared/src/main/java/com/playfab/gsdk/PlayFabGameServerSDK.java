package com.playfab.gsdk;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.*;

/**
 * The SDK game hosts can use to integrate with PlayFab Multiplayer Servers.
 */
public class PlayFabGameServerSDK {
    private static boolean isInitialized = false;

    private static HeartbeatThread heartbeatThread;

    private PlayFabGameServerSDK(){
        // Users should never be able to instantiate this class.
    }

    // Calling start here so that any method users call will guarantee to have the GSDK initialized
    static {
        start();
    }

    /**
     * Blocks indefinitely until the Agent tells us to activate or terminate
     * @throws GSDKInitializationException if our thread is interrupted while waiting
     * @return True if the server has been allocated (is about to receive players). False if the server is terminated.
     */
    public static boolean readyForPlayers() throws GSDKInitializationException {
        if (heartbeatThread.getState() != GameState.Active)
        {
            heartbeatThread.setState(GameState.StandingBy);

            // Wait for active semaphore
            try {
                heartbeatThread.waitForTransitionToActive(0, TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt(); // Let caller know this thread is being interrupted
                throw new GSDKInitializationException("Our thread was interrupted while waiting for Active.", e);
            }
        }

        return heartbeatThread.getState() == GameState.Active;
    }

    /**
     * Retrieves a Map of config settings from the Agent
     * @return the configuration settings, note that these are
     * only guaranteed to be populated after the readyForPlayers()
     * call returns.
     */
    public static GameServerConfiguration getConfigSettings() {
        return new JsonFileConfiguration(heartbeatThread.getConfiguration());
    }

    /**
     * Starts the heartbeat to the Agent.
     *
     * @throws GSDKInitializationException if there was a problem initializing the GSDK
     */
    public static synchronized void start() {
        if (!isInitialized)
        {
            GameServerConfiguration gsdkConfiguration = new JsonFileConfiguration();
            FileLogger.SetLogFolder(gsdkConfiguration.getLogFolder());
            heartbeatThread = new HeartbeatThread(GameState.Initializing, gsdkConfiguration);
            Thread heartbeat = new Thread(heartbeatThread);
            heartbeat.setDaemon(true);
            heartbeat.start();
            isInitialized = true;
        }
    }

    /**
     * Tells the agent which players are connected to this game host
     * @param players the updated list of players that are currently connected
     */
    public static void updateConnectedPlayers(List<GameServerConnectedPlayer> players){
        heartbeatThread.setConnectedPlayers(players);
    }

    /**
     * Registers a function that will be called when the Agent tells us to Terminate
     * @param callback the function we will call on Terminate
     */
    public static void registerShutdownCallback(Runnable callback){
        heartbeatThread.registerShutdownCallback(callback);
    }

    /**
     * Registers a function that will be called when the Agent asks for our game health
     * @param callback the function we will call when we need to get the game host health
     */
    public static void registerHealthCallback(Supplier<Boolean> callback){
        heartbeatThread.registerHealthCallback(callback);
    }

    /**
     * Registers a function that will be called when the Agent tells us a scheduled
     * maintenance is coming up, we will pass in the UTC Datetime of the maintenance event
     * @param callback the function we will call on a new scheduled maintenance
     */
    public static void registerMaintenanceCallback(Consumer<ZonedDateTime> callback){
        heartbeatThread.registerMaintenanceCallback(callback);
    }

    /**
     * Provides a way for the game host to log a custom message.
     * @param message the message to log
     */
    public static void log(String message) {
        FileLogger.Instance().Log(message);
    }

    /**
     * Returns a path to the directory where the game server can save any custom log files.
     * All files in this path will be zipped and uploaded to Azure Blob Storage once the container exits
     * @return path to the folder where all logs should be saved
     */
    public static String getLogsDirectory(){
        return heartbeatThread.getConfiguration().getLogFolder();
    }

    /**
     * Returns a path to the directory shared by all game servers on the VM to store user generated content and other data.
     * @return path to the folder shared by all game servers on the VM.
     */
    public static String getSharedContentDirectory(){
        return heartbeatThread.getConfiguration().getSharedContentFolder();
    }

    /**
     * Returns a path to the directory where game certificate files can be found
     * @return path to the certificate files
     */
    public static String getCertificateDirectory(){
        return heartbeatThread.getConfiguration().getCertificateFolder();
    }

    /**
     * After allocation, returns a list of the initial players that have access to this game server,
     * used by PlayFab's Matchmaking offering
     * @return A list of player ids of the initial players that will connect
     */
    public static List<String> getInitialPlayers() { return heartbeatThread.getInitialPlayers(); }
}
