using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public interface IPlayFabHttp
    {
        Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders);
    }
}
