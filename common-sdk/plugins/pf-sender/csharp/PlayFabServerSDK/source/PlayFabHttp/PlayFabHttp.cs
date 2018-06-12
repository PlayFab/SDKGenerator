using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public class PlayFabHttp : IPlayFabSender
    {
        private readonly IPlayFabHttp _http;

        public PlayFabHttp()
        {
            var httpInterfaceType = typeof(IPlayFabHttp);
            var types = typeof(PlayFabHttp).GetAssembly().GetTypes();
            foreach (var eachType in types)
            {
                if (httpInterfaceType.IsAssignableFrom(eachType) && !eachType.IsAbstract)
                {
                    _http = (IPlayFabHttp)Activator.CreateInstance(eachType.AsType());
                    return;
                }
            }
            throw new Exception("Cannot find a valid IPlayFabHttp type");
        }

        public async Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders)
        {
            if (PlayFabSettings.TitleId == null)
                throw new Exception("You must set your titleId before making an api call");
            return await _http.DoPost(urlPath, request, authType, authKey, extraHeaders);
        }
    }
}
