package com.playfab.gsdk;

import com.google.gson.annotations.SerializedName;

import java.time.ZonedDateTime;

/**
 * Encapsulates the Heartbeat request we receive from the Agent.
 */
public class HeartbeatResponse {
    @SerializedName(value = "sessionConfig")
    public SessionConfig SessionConfig;

    @SerializedName(value = "nextScheduledMaintenanceUtc")
    public ZonedDateTime NextScheduledMaintenanceUtc;

    @SerializedName(value = "operation")
    public GameOperation Operation;
}
