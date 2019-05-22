using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab
{
    /// <summary>
    /// Interface of any transport SDK plugin.
    /// </summary>
    public interface ITransportPlugin : IPlayFabPlugin
    {
        Task<object> DoPost(string fullPath, object request, Dictionary<string, string> headers);
    }
}