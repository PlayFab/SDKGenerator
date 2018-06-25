using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab
{
    /// <summary>
    /// The interface that any PlayFab-compliant transport needs to implement.
    /// </summary>
    public interface IPlayFabSender
    {
        Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders);
    }
}
