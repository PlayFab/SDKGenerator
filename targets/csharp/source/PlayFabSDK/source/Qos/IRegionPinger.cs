#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
using System.Threading.Tasks;

namespace PlayFab.QoS
{
    public interface IRegionPinger
    {
        Task PingAsync();
        QosRegionResult GetResult();
    }
}
#endif