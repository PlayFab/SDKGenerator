package com.playfab.gsdk;


import com.google.gson.*;
import com.playfab.internal.PlayFabHTTP;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * Class that handles sending a heartbeat to the Agent,
 * and dealing with the Agent's response. This is the meat
 * of the GSDK.
 */
public class HeartbeatThread implements Runnable {
    private String agentEndpoint;
    private String heartbeatUrl;
    private String serverId;
    private GameState serverState;
    private List<GameServerConnectedPlayer> connectedPlayers;
    private GameServerConfiguration configuration;
    private List<String> initialPlayers;
    private Runnable shutdownCallback;
    private Supplier<Boolean> healthCallback;
    private Consumer<ZonedDateTime> maintenanceCallback;
    private ZonedDateTime lastScheduledMaintenanceUtc;
    private final Semaphore transitionToActive = new Semaphore(0);
    private final Semaphore signalHeartbeat = new Semaphore(0);

    /**
     * Set up the initial state and gather required info from environment variables.
     * The agent should have set up these env variables when it created the game host image.
     * @param initialState
     * @throws GSDKInitializationException
     */
    protected HeartbeatThread(GameState initialState, GameServerConfiguration config) throws GSDKInitializationException
    {
        FileLogger.Instance().Log("Initializing GSDK");

        this.setState(initialState);
        this.setConnectedPlayers(null);
        this.setInitialPlayers(null);
        this.lastScheduledMaintenanceUtc = null;
        this.transitionToActive.drainPermits();
        this.signalHeartbeat.drainPermits();

        config.validate();
        this.configuration = config;
        this.agentEndpoint = config.getHeartbeatEndpoint();
        this.serverId = config.getServerId();

        FileLogger.Instance().Log("VM Agent Endpoint: " + this.agentEndpoint);
        FileLogger.Instance().Log("Instance Id: " + this.serverId);

        heartbeatUrl = "http://"
                + this.agentEndpoint
                + "/v1/sessionHosts/"
                + this.serverId
                + "/heartbeats";

        // Send an initial heartbeat here in the constructor so that we can fail
        // quickly if the Agent is unreachable.
        try {
            HeartbeatResponse heartbeatInfo = this.sendHeartbeat(this.getState());
            PerformOperation(heartbeatInfo.Operation);
        } catch (ExecutionException | InterruptedException e) {
            GSDKInitializationException initException =
                    new GSDKInitializationException("Failed to contact Agent. GSDK failed to initialize.", e);
            FileLogger.Instance().LogError(initException);
            throw initException;
        }

        FileLogger.Instance().Log("GSDK Initialized");
    }

    protected synchronized void setState(GameState state)
    {
        if (this.serverState != state)
        {
            this.serverState = state;
            this.signalHeartbeat.release();
        }
    }

    protected synchronized GameState getState()
    {
        return this.serverState;
    }

    protected synchronized void setConnectedPlayers(List<GameServerConnectedPlayer> players) {
        this.connectedPlayers = players;
    }

    protected synchronized List<GameServerConnectedPlayer> getConnectedPlayers() { return this.connectedPlayers; }

    protected synchronized void setInitialPlayers(List<String> initPlayers) {
        this.initialPlayers = initPlayers;
    }

    protected synchronized List<String> getInitialPlayers() { return this.initialPlayers; }

    protected synchronized void registerShutdownCallback(Runnable callback)
    {
        this.shutdownCallback = callback;
    }

    protected synchronized void registerHealthCallback(Supplier<Boolean> callback)
    {
        this.healthCallback = callback;
    }

    protected synchronized void registerMaintenanceCallback(Consumer<ZonedDateTime> callback)
    {
        this.maintenanceCallback = callback;
    }

    protected GameServerConfiguration getConfiguration() {
        // This is used by GameserverSDK.java when a user wants a copy of the current config settings
        // Note that a copy constructor uses an iterator, and even with Synchronized Collections, we
        // need to place any iterators in a manual synchronized block
        // https://docs.oracle.com/javase/6/docs/api/java/util/Collections.html#synchronizedSet%28java.util.Set%29
        synchronized (this.configuration) {
            return this.configuration;
        }
    }

    /**
     * Waits until the active semaphore has been signaled
     * @param timeout the ammount of time to wait (if <= 0 we wait indefinitely)
     * @param timeUnit the unit of time to wait
     * @return true if the semaphore was signaled, false if instead we timed out
     * @throws InterruptedException if the owner of the thread is asking us to stop
     */
    public boolean waitForTransitionToActive(long timeout, TimeUnit timeUnit) throws InterruptedException
    {
        if (timeout <= 0) {
            transitionToActive.acquire();
            return true;
        } else {
            return transitionToActive.tryAcquire(timeout, timeUnit);
        }
    }

    /**
     * This method heartbeats to the agent every second until
     * we receive a Terminate operation
     */
    @Override
    public void run() {
        while (true) {
            try {
                // Wait until our interval times out or a state change happens
                if (signalHeartbeat.tryAcquire(1000, TimeUnit.MILLISECONDS))
                {
                    FileLogger.Instance().Log("Game state transition occurred, new game state is: "+this.serverState+". Sending heartbeat sooner than the configured 1 second interval.");
                    signalHeartbeat.drainPermits(); // Ensure we need a new signal to break in early again
                }

                // Send our heartbeat
                GameState currentState = this.getState();
                HeartbeatResponse response = sendHeartbeat(currentState);

                // If they sent us a config, save it
                SessionConfig responseConfig = response.SessionConfig;
                if (responseConfig != null)
                {
                    if (responseConfig.sessionId != null)
                    {
                        this.configuration.setSessionId(responseConfig.sessionId.toString());
                    }

                    if (responseConfig.sessionCookie != null && !responseConfig.sessionCookie.isEmpty())
                    {
                        this.configuration.setSessionCookie(responseConfig.sessionCookie);
                    }

                    if (responseConfig.initialPlayers != null && !responseConfig.initialPlayers.isEmpty())
                    {
                        this.setInitialPlayers(responseConfig.initialPlayers);
                    }
                }

                // If there's a scheduled maintenance that we haven't notified about, do so now
                Consumer<ZonedDateTime> callback = this.maintenanceCallback;
                ZonedDateTime nextMaintenance = response.NextScheduledMaintenanceUtc;
                if (callback != null && nextMaintenance != null && !nextMaintenance.equals(this.lastScheduledMaintenanceUtc))
                {
                    callback.accept(nextMaintenance); // should this be in a new thread?
                    this.lastScheduledMaintenanceUtc = nextMaintenance; // cache it, since we only want to notify once
                }

                // If Terminating, send a last heartbeat that we're done and exit the loop
                if (currentState == GameState.Terminating)
                {
                    // Further shutdown logic can go here
                    sendHeartbeat(GameState.Terminated);
                    break;
                }

                // Perform the operation that the server requested
                PerformOperation(response.Operation);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    /**
     * Uses Apache HttpClient to send the heartbeat to the agent.  This method will automaticall retry if a failure occurs.
     * @param currentState The state we're sending
     * @return The response we got from the Agent
     * @throws ExecutionException If an unexpected exception is raised by one of the retry attempts then that exception will
     * be included as the 'cause' in an ExceutionException.
     */
    private HeartbeatResponse sendHeartbeat(GameState currentState) throws ExecutionException, InterruptedException {
        HeartbeatRequest payload = new HeartbeatRequest();
        payload.CurrentGameState = currentState;
        payload.CurrentPlayers = this.getConnectedPlayers();

        Supplier<Boolean> callback = this.healthCallback;
        if (callback != null)
        {
            payload.CurrentGameHealth = callback.get() ? "Healthy" : "Unhealthy";
        }

        FutureTask<Object> task = PlayFabHTTP.doPost(heartbeatUrl, payload, null, null);
        task.run();
        Object httpResult = task.get();
        String resultRawJson = (String) httpResult;

        // Create a gson object that knows how to handle LocalDateTime
        Gson gson = new GsonBuilder().registerTypeAdapter(ZonedDateTime.class, (JsonDeserializer<ZonedDateTime>) (json, type, jsonDeserializationContext) ->
                ZonedDateTime.parse(json.getAsJsonPrimitive().getAsString()).withZoneSameLocal(ZoneId.of("UTC"))).create();

        HeartbeatResponse result = gson.fromJson(resultRawJson, HeartbeatResponse.class);

        StringBuilder playersString = new StringBuilder();
        if (this.getConnectedPlayers() != null && this.getConnectedPlayers().size() > 0) {
            this.getConnectedPlayers().forEach((p) -> playersString.append(p.getPlayerId() + ","));
        }

        FileLogger.Instance().Log("Heartbeat request: { state = " + currentState
                + ", connectedPlayers = " + playersString
                + " } response: { Next Operation = " + result.Operation
                + " New Interval = " + result.NextScheduledMaintenanceUtc + "}");
        return result;
    }

    /**
     * Handles the agent response Operation
     * @param newOperation the operation we received
     */
    private void PerformOperation(GameOperation newOperation)
    {
        switch(newOperation) {
            case Continue:
                // No action required
                break;
            case Active:
                if (this.getState() != GameState.Active) {
                    this.setState(GameState.Active);
                    this.transitionToActive.release();
                }
                break;
            case Terminate:
                if (this.getState() != GameState.Terminating) {
                    this.setState(GameState.Terminating);
                    this.transitionToActive.release();
                    Runnable temp = shutdownCallback;
                    if (temp != null) {
                        temp.run();
                    }
                }
                break;
            default:
                FileLogger.Instance().LogError("Unknown operation received: " + newOperation);
        }

    }
}
