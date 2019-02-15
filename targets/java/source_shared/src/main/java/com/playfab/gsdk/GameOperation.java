package com.playfab.gsdk;

/**
 * The operations our PlayFab Agent can ask the game to perform
 */
public enum GameOperation {
    // An operation was not sent in the heartbeat
    Invalid,

    // No state changes required
    Continue,

    // Place this game server in a Quarantined state
    Quarantine,

    // Place this game server in an Active state
    Active,

    // Place this game server in a Terminating state
    Terminate
}