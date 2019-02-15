package com.playfab.gsdk;

import com.google.gson.annotations.SerializedName;

import java.util.List;
import java.util.UUID;

/**
 * Configuration for a game session
 */
class SessionConfig {
    @SerializedName(value = "sessionId")
    public UUID sessionId;

    @SerializedName(value = "sessionCookie")
    public String sessionCookie;

    @SerializedName(value = "initialPlayers")
    public List<String> initialPlayers;
}
