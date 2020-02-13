
#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using System.Collections.Generic;

    public class QosRegionResult
    {
        public string Region;

        public int LatencyMs;

        public IReadOnlyList<int> RawMeasurements;

        public int NumTimeouts;

        public int ErrorCode;
    }

    internal class QosRegionResultSummary
    {
        public static QosRegionResultSummary CreateFrom(QosRegionResult result)
        {
            return new QosRegionResultSummary
            {
                Region = result.Region,
                LatencyMs = result.LatencyMs,
                ErrorCode = result.ErrorCode,
                NumTimeouts = result.NumTimeouts
            };
        }

        public string Region;

        public int NumTimeouts;

        public int LatencyMs;

        public int ErrorCode;
    }
}
#endif
