package com.playfab.gsdk;

import java.util.List;
import java.util.UUID;

/**
 * Configuration for a game session
 */
class SessionConfig {
    public UUID sessionId;

    public String sessionCookie;

    public List<String> initialPlayers;
}
