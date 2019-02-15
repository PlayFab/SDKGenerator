package com.playfab.gsdk;

/**
 * The states a Game server can get into during its lifecycle
 */
public enum GameState {
    // A state has not yet been set
    Invalid,

    // The game server is starting
    Initializing,

    // The game server has finished initialization and called ReadyForPlayers
    StandingBy,

    // The game server has been allocated, players are about to connect
    Active,

    // The game server is shutting down
    Terminating,

    // The game server has ended
    Terminated,

    // PlayFab is requesting this game server remain idle for debugging purposes.
    // Note that this state is not yet being used
    Quarantined
}