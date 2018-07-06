using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PlayFab.Internal;

namespace PlayFab
{
    /// <summary>
    /// Sends request data.
    /// </summary>
    public class PlayFabTransport: ITransportPlugin
    {
        private static readonly IPlayFabHttp _http;

        static PlayFabTransport()
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

        /// <summary>
        /// Implementation of send data operation.
        /// </summary>
        /// <param name="urlPath">The URL path.</param>
        /// <param name="request">The request object.</param>
        /// <param name="authType">The authentication type.</param>
        /// <param name="authKey">The authentication key.</param>
        /// <param name="extraHeaders">Extra headers.</param>
        /// <returns>A task that returns a result of operation.</returns>
        public async Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders)
        {
            return await _http.DoPost(urlPath, request, authType, authKey, extraHeaders);
        }
    }
}
