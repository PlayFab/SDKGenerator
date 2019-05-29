namespace PlayFab.QoS
{
    using MultiplayerModels;

    public class QosRegionResult
    {
        public AzureRegion Region { get; set; }

        public int LatencyMs { get; set; }

        public int ErrorCode { get; set; }
    }
}
