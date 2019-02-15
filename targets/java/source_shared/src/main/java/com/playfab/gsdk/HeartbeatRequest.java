package com.playfab.gsdk;

import java.util.List;

/**
 * Encapsulates the Heartbeat request we send to the Agent.
 */
public class HeartbeatRequest
{
    /**
     * The current game state. For example - StandingBy, Active, etc.
     */
    public GameState CurrentGameState;

    /**
     * The last queried game host health status
     */
    public String CurrentGameHealth;

    /**
     * Keeps track of the current list of connected players
     */
    public List<GameServerConnectedPlayer> CurrentPlayers;
}
