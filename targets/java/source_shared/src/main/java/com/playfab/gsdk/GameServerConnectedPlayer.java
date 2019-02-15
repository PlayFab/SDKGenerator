package com.playfab.gsdk;

/**
 * Describes a player that is connected to the game server.
 */
public class GameServerConnectedPlayer {
    private String playerId;

    public GameServerConnectedPlayer(String newPlayerId){
        this.setPlayerId(newPlayerId);
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }

}