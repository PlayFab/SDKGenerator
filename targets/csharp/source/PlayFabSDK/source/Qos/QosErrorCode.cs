namespace PlayFab.QoS
{
    public enum QosErrorCode
    {
        Success = 0,
        NotLoggedIn = 1,
        FailedToRetrieveServerList = 2,
        FailedToUploadQosResult = 3,
        Timeout = 4
    }
}
