using System.Threading.Tasks;

namespace PlayFab.QoS
{
    public interface IRegionPinger
    {
        Task PingAsync();
        QosRegionResult GetResult();
    }
}
