package com.playfab.gsdk;

import com.google.gson.Gson;
import com.google.gson.annotations.SerializedName;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Grabs configuration values from a json config file
 */
public class JsonFileConfiguration extends GameServerConfiguration {
    protected static final String CONFIG_FILE_VARIABLE_NAME = "GSDK_CONFIG_FILE";

    protected JsonFileConfiguration() {
        super();

        Path configFilePath = Paths.get(System.getenv(CONFIG_FILE_VARIABLE_NAME));
        try {
            // Gson doesn't have a way of populating "this" object with json, so we use a helper inner class
            // to specify the json file format
            Gson gson = new Gson();
            String json = new String(Files.readAllBytes(configFilePath), "UTF-8");
            JsonGsdkSchema configValues = gson.fromJson(json, JsonGsdkSchema.class);
            setHeartbeatEndpoint(configValues.heartbeatEndpoint);
            setServerId(configValues.sessionHostId);
            setLogFolder(configValues.logFolder);
            setSharedContentFolder(configValues.sharedContentFolder);
            setCertificateFolder(configValues.certificateFolder);
            setBuildMetadata(configValues.buildMetadata);
            setGamePorts(configValues.gamePorts);
        } catch (IOException e) {
            StringWriter errors = new StringWriter();
            e.printStackTrace(new PrintWriter(errors));
            String errorMessage = "Could not read configuration file: " + configFilePath.toString() + " Exception: " + errors.toString();
            FileLogger.Instance().LogError(errorMessage);
            throw new GSDKInitializationException(errorMessage);
        }
    }

    protected JsonFileConfiguration(GameServerConfiguration other)
    {
        super(other);
    }

    @Override
    public void validate() throws GSDKInitializationException {
        if((this.getHeartbeatEndpoint() == null || this.getHeartbeatEndpoint().isEmpty()) &&
                (this.getServerId() == null || this.getServerId().isEmpty())){
            String errorMessage = "Config file must include values for the heartbeatEndpoint and the sessionHostId.";
            FileLogger.Instance().LogError(errorMessage);
            throw new GSDKInitializationException(errorMessage);
        }
        else if(this.getHeartbeatEndpoint() == null || this.getHeartbeatEndpoint().isEmpty()){
            String errorMessage = "Config file must include a value for the heartbeatEndpoint.";
            FileLogger.Instance().LogError(errorMessage);
            throw new GSDKInitializationException(errorMessage);
        }
        else if(this.getServerId() == null || this.getServerId().isEmpty()){
            String errorMessage = "Config file must include a value for the sessionHostId.";
            FileLogger.Instance().LogError(errorMessage);
            throw new GSDKInitializationException(errorMessage);
        }
    }

    /**
     * Helper class to hold the fields that we expect to see
     * in our json config file
     */
    protected class JsonGsdkSchema
    {
        @SerializedName(value = "heartbeatEndpoint", alternate = {"HeartbeatEndpoint", "HEARTBEATENDPOINT", "heartbeatendpoint"})
        public String heartbeatEndpoint;

        @SerializedName(value = "sessionHostId", alternate = {"SessionHostId", "SESSIONHOSTID", "sessionhostid"})
        public String sessionHostId;

        @SerializedName(value = "logFolder", alternate = {"LogFolder", "LOGFOLDER", "logfolder"})
        public String logFolder;

        @SerializedName(value = "sharedContentFolder", alternate = {"SharedContentFolder"})
        public String sharedContentFolder;

        @SerializedName(value = "certificateFolder", alternate = {"CertificateFolder", "CERTIFICATEFOLDER", "certificatefolder"})
        public String certificateFolder;

        @SerializedName(value = "buildMetadata", alternate = {"BuildMetadata", "BUILDMETADATA", "buildmetadata"})
        public Map<String, String> buildMetadata;

        @SerializedName(value = "gamePorts", alternate = {"GamePorts", "GAMEPORTS", "gameports"})
        public Map<String, String> gamePorts;
    }
}
