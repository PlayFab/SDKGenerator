using System.Collections.Generic;
using System.Threading.Tasks;
using PlayFab.Internal;

namespace PlayFab
{
    /// <summary>
    /// Interface of any transport SDK plugin.
    /// </summary>
    public interface ITransportPlugin: IPlayFabPlugin
    {
        Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders);
    }
}