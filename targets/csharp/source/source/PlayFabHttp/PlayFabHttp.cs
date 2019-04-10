using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    /// <summary>
    /// This is a base-class for all Api-request objects.
    /// It is currently unfinished, but we will add result-specific properties,
    ///   and add template where-conditions to make some code easier to follow
    /// </summary>
    public class PlayFabRequestCommon
    {
        public PlayFabAuthenticationContext AuthenticationContext;
    }

    /// <summary>
    /// This is a base-class for all Api-result objects.
    /// It is currently unfinished, but we will add result-specific properties,
    ///   and add template where-conditions to make some code easier to follow
    /// </summary>
    public class PlayFabResultCommon
    {
    }

    public class PlayFabLoginResultCommon : PlayFabResultCommon
    {
        public PlayFabAuthenticationContext AuthenticationContext;
    }

    public class PlayFabJsonError
    {
        public int code;
        public string status;
        public string error;
        public int errorCode;
        public string errorMessage;
        public Dictionary<string, string[]> errorDetails = null;
    }

    public class PlayFabJsonSuccess<TResult> where TResult : PlayFabResultCommon
    {
        public int code;
        public string status;
        public TResult data;
    }

    public static class PlayFabHttp
    {
        public static async Task<object> DoPost(string urlPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders, PlayFabApiSettings instanceSettings = null)
        {
            var settings = instanceSettings ?? PlayFabSettings.staticSettings;
            var fullPath = settings.GetFullUrl(urlPath);
            return await _DoPost(fullPath, request, authType, authKey, extraHeaders, instanceSettings);
        }

        public static async Task<object> DoPostWithFullUri(string fullUriPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders, PlayFabApiSettings instanceSettings = null)
        {
            return await _DoPost(fullUriPath, request, authType, authKey, extraHeaders, instanceSettings);
        }

        private static async Task<object> _DoPost(string fullPath, PlayFabRequestCommon request, string authType, string authKey, Dictionary<string, string> extraHeaders, PlayFabApiSettings instanceSettings = null)
        {
            var settings = instanceSettings ?? PlayFabSettings.staticSettings;
            var titleId = settings.TitleId;
            if (titleId == null)
                throw new PlayFabException(PlayFabExceptionCode.TitleNotSet, "You must set your titleId before making an api call");
            var transport = PluginManager.GetPlugin<ITransportPlugin>(PluginContract.PlayFab_Transport);

            var headers = new Dictionary<string, string>();
            if (authType != null && authKey != null)
            {
                headers[authType] = authKey;
            }
            if (extraHeaders != null)
            {
                foreach (var extraHeader in extraHeaders)
                {
                    headers.Add(extraHeader.Key, extraHeader.Value);
                }
            }

            return await transport.DoPost(fullPath, request, headers);
        }
    }
}
