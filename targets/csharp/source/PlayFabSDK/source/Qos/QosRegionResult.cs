#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using MultiplayerModels;

    public class QosRegionResult
    {
        public AzureRegion Region;

        public int LatencyMs;

        public int ErrorCode;

        public string ErrorMessage;
    }

    /// <summary>
    /// This class is used to json serialize the content to send to playfab
    /// </summary>
    internal class QosRegionResultFacade
    {
        public static QosRegionResultFacade CreateFrom(QosRegionResult result)
        {
            return new QosRegionResultFacade
            {
                Region = result.Region,
                LatencyMs = result.LatencyMs,
                ErrorCode = result.ErrorCode
            };
        }

        public AzureRegion Region;

        public int LatencyMs;

        public int ErrorCode;
    }
}
#endif
