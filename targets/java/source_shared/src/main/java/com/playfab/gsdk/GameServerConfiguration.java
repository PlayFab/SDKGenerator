package com.playfab.gsdk;

import java.util.HashMap;
import java.util.Map;

/**
 * Various properties that can be configured for the GSDK.
 * As long as it implements this interface, the GSDK can accept configurations
 * from various sources, such as environment variables, json files, etc.
 */
abstract class GameServerConfiguration {
    private String heartbeatEndpoint;
    private String serverId;
    private String logFolder;
    private String sharedContentFolder;
    private String certificateFolder;
    private String titleId;
    private String buildId;
    private String region;
    private Map<String, String> buildMetadata;
    private Map<String, String> gamePorts;

    // These two will be non-null only after allocation
    private String sessionId;
    private String sessionCookie;

    public GameServerConfiguration()
    {
        // These are always set as environment variables, even with the new gsdk config json file
        this.setTitleId(System.getenv(TITLE_ID_VARIABLE_NAME));
        this.setBuildId(System.getenv(BUILD_ID_VARIABLE_NAME));
        this.setRegion(System.getenv(REGION_VARIABLE_NAME));
    }

    public GameServerConfiguration(GameServerConfiguration other)
    {
        this.setHeartbeatEndpoint(other.getHeartbeatEndpoint());
        this.setServerId(other.getServerId());
        this.setLogFolder(other.getLogFolder());
        this.setSharedContentFolder(other.getSharedContentFolder());
        this.setCertificateFolder(other.getCertificateFolder());
        this.setTitleId(other.getTitleId());
        this.setBuildId(other.getBuildId());
        this.setRegion(other.getRegion());
        this.setBuildMetadata(new HashMap<>(other.getBuildMetadata()));
        this.setGamePorts(new HashMap<>(other.getGamePorts()));
    }

    abstract void validate() throws GSDKInitializationException;

    final String TITLE_ID_VARIABLE_NAME = "PF_TITLE_ID";
    final String BUILD_ID_VARIABLE_NAME = "PF_BUILD_ID";
    final String REGION_VARIABLE_NAME = "PF_REGION";

    public String getHeartbeatEndpoint() {
        return heartbeatEndpoint;
    }

    public void setHeartbeatEndpoint(String heartbeatEndpoint) {
        this.heartbeatEndpoint = heartbeatEndpoint;
    }

    public String getServerId() {
        return serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
    }

    public String getLogFolder() {
        return logFolder;
    }

    public void setLogFolder(String logFolder) {
        this.logFolder = logFolder;
    }

    public String getSharedContentFolder() {
        return sharedContentFolder;
    }

    public void setSharedContentFolder(String sharedContentFolder) {
        this.sharedContentFolder = sharedContentFolder;
    }

    public String getCertificateFolder() {
        return certificateFolder;
    }

    public void setCertificateFolder(String certificateFolder) {
        this.certificateFolder = certificateFolder;
    }

    public String getTitleId() {
        return titleId;
    }

    public void setTitleId(String titleId) {
        this.titleId = titleId;
    }

    public String getBuildId() {
        return buildId;
    }

    public void setBuildId(String buildId) {
        this.buildId = buildId;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public Map<String, String> getBuildMetadata() {
        return buildMetadata;
    }

    public void setBuildMetadata(Map<String, String> buildMetadata) {
        this.buildMetadata = buildMetadata;
    }

    public Map<String, String> getGamePorts() {
        return gamePorts;
    }

    public void setGamePorts(Map<String, String> gamePorts) {
        this.gamePorts = gamePorts;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getSessionCookie() {
        return sessionCookie;
    }

    public void setSessionCookie(String sessionCookie) {
        this.sessionCookie = sessionCookie;
    }
}