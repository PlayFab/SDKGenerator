#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using System.Collections.Generic;

    public class QosResult
    {
        public List<QosRegionResult> RegionResults;

        public int ErrorCode;

        public string ErrorMessage;
    }

    /// <summary>
    /// This class is used to json serialize the content to send to playfab
    /// </summary>
    internal class QosResultFacade
    {
        public static QosResultFacade CreateFrom(QosResult result)
        {
            var regionResults = new List<QosRegionResultFacade>(result.RegionResults.Count);
            foreach (QosRegionResult regionResult in result.RegionResults)
            {
                regionResults.Add(QosRegionResultFacade.CreateFrom(regionResult));
            }

            return new QosResultFacade
            {
                RegionResults = regionResults,
                ErrorCode = result.ErrorCode
            };
        }

        public List<QosRegionResultFacade> RegionResults;

        public int ErrorCode;
    }
}
#endif
