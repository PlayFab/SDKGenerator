package com.playfab.gsdk;

import java.time.ZonedDateTime;

/**
 * Encapsulates the Heartbeat request we receive from the Agent.
 */
public class HeartbeatResponse {
    public SessionConfig SessionConfig;

    public ZonedDateTime NextScheduledMaintenanceUtc;

    public GameOperation Operation;
}
