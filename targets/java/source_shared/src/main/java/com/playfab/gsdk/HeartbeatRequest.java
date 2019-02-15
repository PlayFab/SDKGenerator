package com.playfab.gsdk;

import com.google.gson.annotations.SerializedName;

import java.util.List;

/**
 * Encapsulates the Heartbeat request we send to the Agent.
 */
public class HeartbeatRequest
{
    /**
     * The current game state. For example - StandingBy, Active, etc.
     */
    @SerializedName(value = "currentGameState")
    public GameState CurrentGameState;

    /**
     * The last queried game host health status
     */
    @SerializedName(value = "currentGameHealth")
    public String CurrentGameHealth;

    /**
     * Keeps track of the current list of connected players
     */
    @SerializedName(value = "currentPlayers")
    public List<GameServerConnectedPlayer> CurrentPlayers;
}
