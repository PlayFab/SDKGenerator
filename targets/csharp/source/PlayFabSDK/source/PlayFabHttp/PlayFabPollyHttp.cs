using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;
using Polly.Wrap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace PlayFab.Internal
{   
    /// <summary>
    /// A Polly wrapped version of PlayFab Transport plug in which used
    /// when making http requests to PlayFab Main Server.
    /// </summary>
    public class PlayFabPollyHttp : PlayFabSysHttp, ITransportPlugin
    {
        /// <summary>
        /// Http requests worth retrying
        /// </summary>
        public HashSet<int> HttpStatusCodesWorthRetrying = new HashSet<int> {
            408, //HttpStatusCode.RequestTimeout
            409, //HttpStatusCode.Conflict
            429, //HttpStatusCode.TooManyRequests
            500, //HttpStatusCode.InternalServerError
            502, //HttpStatusCode.BadGateway
            503, //HttpStatusCode.ServiceUnavailable
            504  //HttpStatusCode.GatewayTimeout
        };

        /// <summary>
        /// Gets or set the name of the plug in. Used by the PluginManager when looking up
        /// plugins upon request.
        /// </summary>
        public string Name;

        /// <summary>
        /// Gets the PlayFab retry policies
        /// </summary>
        public AsyncRetryPolicy<object> RetryPolicy { get; private set; }

        /// <summary>
        /// Constructor for objects of type PollyTransportPlug.
        /// <remarks>
        /// Sets a default resilience policy with the following common settings
        /// 1) Sets the retry to 3 times and has an embedded backoff.
        ///</remarks>
        /// </summary>
        public PlayFabPollyHttp()
        {
            var jitterer = new Random();
            var retryPolicy = Policy
               .Handle<Exception>()
                .OrResult<object>(r => r != null && (r as PlayFabError) != null && HttpStatusCodesWorthRetrying.Contains((r as PlayFabError).HttpCode))
                    .WaitAndRetryAsync(1,
                      retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))  // exponential back-off: 2, 4, 8 etc
                                + TimeSpan.FromMilliseconds(jitterer.Next(0, 1000)));  // plus some jitter: up to 1 
            RetryPolicy = retryPolicy;

            Name = "PlayFabWithPolly";
        }

        /// <inheritdoc/>
        public new async Task<object> DoPost(string fullPath, object request, Dictionary<string, string> headers)
        {
            object doPostResult = await RetryPolicy
                .ExecuteAsync(async () =>
                {
                    return await base.DoPost(fullPath, request, headers);
                });

            return doPostResult;
        }

        /// <summary>
        /// Overrides the Polly Policies to enforce.
        /// </summary>
        public void OverridePolicies(AsyncRetryPolicy<object> policy)
        {
            RetryPolicy = policy;
        }
    }
}
