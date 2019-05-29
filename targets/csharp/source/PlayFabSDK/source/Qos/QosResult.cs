namespace PlayFab.QoS
{
    using System.Collections.Generic;

    public class QosResult
    {
        public List<QosRegionResult> RegionResults { get; set; }

        public int ErrorCode { get; set; }
    }
}
