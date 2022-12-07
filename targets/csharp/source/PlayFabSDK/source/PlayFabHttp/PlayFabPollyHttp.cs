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
            500, //HttpStatusCode.InternalServerError
            502, //HttpStatusCode.BadGateway
            503, //HttpStatusCode.ServiceUnavailable
            504 //HttpStatusCode.GatewayTimeout
        };

        /// <summary>
        /// Gets or set the name of the plug in. Used by the PluginManager when looking up
        /// plugins upon request.
        /// </summary>
        public string Name;

        /// <summary>
        /// Gets the resilience policies defined.
        /// </summary>
        public AsyncPolicyWrap<object> CommonResilience { get; private set; }

        /// <summary>
        /// Constructor for objects of type PollyTransportPlug.
        /// <remarks>
        /// Sets a default resilience policy with the fololwing common settings
        /// 1) Sets the retry to 3 times and has an embedded backoff.
        /// 2) > Sets a circuit breaker that will trigger is 25% of collapsed calls within 
        ///      a 5 second window are failing.
        ///    > Period for evaluation requires a burst of >=2RPS before evaluating breaker rule,
        ///      requires a minimum of 10 requests in 5 seconds, and the circuit breaker will
        ///      will be open for 20 second.
        /// More information on the client can be found here: https://github.com/App-vNext/Polly
        ///</remarks>
        /// </summary>
        public PlayFabPollyHttp()
        {
            var jitterer = new Random();
            var retryPolicy = Policy
               .Handle<Exception>()
               .OrResult<object>(r => r != null && HttpStatusCodesWorthRetrying.Contains((r as PlayFabError).HttpCode))
                    .WaitAndRetryAsync(1,
                      retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))  // exponential back-off: 2, 4, 8 etc
                                + TimeSpan.FromMilliseconds(jitterer.Next(0, 1000)));  // plus some jitter: up to 1 second

            var breakerPolicy = Policy.Handle<Exception>()
                .OrResult<object>(r => r != null && HttpStatusCodesWorthRetrying.Contains((r as PlayFabError).HttpCode))
                .AdvancedCircuitBreakerAsync(
                    failureThreshold: 0.25,
                    samplingDuration: TimeSpan.FromSeconds(5),
                    minimumThroughput: 2,
                    durationOfBreak: TimeSpan.FromSeconds(20));

            CommonResilience = breakerPolicy.WrapAsync(retryPolicy);
        }

        /// <inheritdoc/>
        public new async Task<object> DoPost(string fullPath, object request, Dictionary<string, string> headers)
        {
            object doPostResult = await CommonResilience
                .ExecuteAsync(async () =>
                {
                    var result = await base.DoPost(fullPath, request, headers) as PlayFabError;
                    return result;
                });

            return doPostResult;
        }

        /// <summary>
        /// Overrides the Polly Policies to enforce.
        /// </summary>
        /// <param name="retryPolicy">The retry policy to use.</param>
        /// <param name="breakerPolicy">The circuit breaker policy to use.</param>
        /// <exception cref="ArgumentNullException"> Thrown when retryPolicy and/or breakerPolicy is null.</exception>
        public void OverridePolicies(AsyncPolicyWrap<object> policy)
        {
            CommonResilience = policy;
        }
    }
}