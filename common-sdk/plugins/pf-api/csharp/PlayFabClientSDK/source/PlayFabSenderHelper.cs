using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab
{
    public static class PlayFabSenderHelper
    {
        private static IPlayFabSender sender = (IPlayFabSender)PluginManager.Instance.GetPluginBySettingKey("plugin-sender");

        public static async Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders)
        {
            return await sender.DoPost(urlPath, request, authType, authKey, extraHeaders);
        }
    }
}
