// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace PlayFab
{
    // TODO: This should eventually be merged with PlayFabHttp
    interface IGameserverHttpClient
    {
        Task<HeartbeatResponse> SendHeartbeatAsync(HeartbeatRequest request);
    }

    static class GameserverHttpClientFactory
    {
        public static IGameserverHttpClient Instance { get; set; }

        public static IGameserverHttpClient CreateInstance(string baseUrl)
        {
            if (Instance == null)
            {
                Instance = new GameserverHttpClientProxy(baseUrl);
            }

            return Instance;
        }
    }

    class GameserverHttpClientProxy : HttpClient, IGameserverHttpClient
    {
        private string _baseUrl;
        private HttpClient _client;
        private ISerializerPlugin _jsonSerializer;

        public GameserverHttpClientProxy(string baseUrl)
        {
            _baseUrl = baseUrl;
            _client = new HttpClient();
            _jsonSerializer = PlayFab.PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);


            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("Accept", "application/json");
            _client.DefaultRequestHeaders.Add("User-Agent", "Microsoft PlayFab Game SDK");
        }

        public async Task<HeartbeatResponse> SendHeartbeatAsync(HeartbeatRequest request)
        {
            string formattedText = _jsonSerializer.SerializeObject(request);
            var requestMessage = new HttpRequestMessage
            {
                Method = new HttpMethod("PATCH"),
                RequestUri = new Uri(_baseUrl),
                Content = new StringContent(formattedText, Encoding.UTF8, "application/json"),
            };

            HttpResponseMessage responseMessage = await _client.SendAsync(requestMessage);

            responseMessage.EnsureSuccessStatusCode();

            HeartbeatResponse response = _jsonSerializer.DeserializeObject<HeartbeatResponse>(
                await responseMessage.Content.ReadAsStringAsync());

            return response;
        }
    }
}
#endif