using System.Net;
using System.Net.Http;

namespace PlayFab.Internal
{
    internal class HttpTransportWithDecompression : PlayFabSysHttp
    {
        public HttpTransportWithDecompression()
        {
            var handler = new HttpClientHandler
            {
                AutomaticDecompression = DecompressionMethods.GZip,
            };
            _client = new HttpClient(handler);
        }
    }
}