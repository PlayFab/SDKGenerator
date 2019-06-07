#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
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
#endif

