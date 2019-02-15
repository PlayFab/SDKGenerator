package com.playfab.gsdk;

/**
 * Exception thrown when there was an issue initializing the GSDK.
 * Since it derives from RuntimeException, this is an unchecked exception,
 * because if the GSDK fails to initialize, that is a non-recoverable error.
 */
public class GSDKInitializationException extends RuntimeException {
    public GSDKInitializationException(String message){
        super(message);
    }

    public GSDKInitializationException(String message, Throwable cause){
        super(message, cause);
    }
}
