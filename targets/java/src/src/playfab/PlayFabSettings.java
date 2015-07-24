package playfab;

import playfab.PlayFabErrors.ErrorCallback;

public class PlayFabSettings {
    
    public static String TitleId = null;
    public static ErrorCallback GlobalErrorHandler;
    public static String LogicServerURL = null;
    public static String DeveloperSecretKey = null;
    
    
    public static String GetLogicURL() {
        return "https://" + LogicServerURL;
    }
    
    public static String GetURL() {
        return "https://" + TitleId + ".playfabapi.com";
    }
}