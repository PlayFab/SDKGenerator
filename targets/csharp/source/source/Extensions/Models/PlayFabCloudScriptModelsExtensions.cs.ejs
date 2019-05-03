namespace PlayFab.CloudScriptModels
{
    using System.Threading.Tasks;
    /// <summary>
    /// Used for extracting the data fields incoming as payload to Azure Functions into their respective objects. 
    /// Provides  fields through ApiSettings and AuthenticationContext, the profile of the caller, as well as the 
    /// arguments passed to the execution request.
    /// </summary>
    /// <typeparam name="TFunctionArgument">Type of FunctionArgument</typeparam>
    public class FunctionExecutionContext<TFunctionArgument>
    {
        public PlayFabApiSettings ApiSettings { get; private set; }

        public PlayFabAuthenticationContext AuthenticationContext { get; set; }

        public ProfilesModels.EntityProfileBody CallerEntityProfile { get; set; }

        public TFunctionArgument FunctionArgument { get; set; }

        protected FunctionExecutionContext() { }

        /// <summary>
        /// Creates a new <c>FunctionExecutionContext</c> out of the incoming request to an Azure Function.
        /// </summary>
        /// <param name="request">The request incoming to an Azure Function from the PlayFab server</param>
        /// <returns>A new populated <c>FunctionExecutionContext</c> instance</returns>
        public static async Task<FunctionExecutionContext<TFunctionArgument>> Create(System.Net.Http.HttpRequestMessage request)
        {
            using (var content = request.Content) 
            {
                var body = await content.ReadAsStringAsync();
                var contextInternal = Json.PlayFabSimpleJson.DeserializeObject<FunctionExecutionContextInternal>(body);
                var settings = new PlayFabApiSettings
                {
                    TitleId = contextInternal.TitleAuthenticationContext.Id,
#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API
                    DeveloperSecretKey = contextInternal.TitleAuthenticationContext.SecretKey
#endif
                };
                var authContext = new PlayFabAuthenticationContext
                {
                    EntityToken = contextInternal.TitleAuthenticationContext.EntityToken
                };

                return new FunctionExecutionContext<TFunctionArgument>()
                {
                    ApiSettings = settings,
                    CallerEntityProfile = contextInternal.CallerEntityProfile,
                    FunctionArgument = contextInternal.FunctionArgument,
                    AuthenticationContext = authContext
                };
            }
        }

        private class FunctionExecutionContextInternal
        {
            public TitleAuthenticationContext TitleAuthenticationContext { get; set; }

            public ProfilesModels.EntityProfileBody CallerEntityProfile { get; set; }

            public TFunctionArgument FunctionArgument { get; set; }
        }

        private class TitleAuthenticationContext
        {
            public string Id { get; set; }
            public string SecretKey { get; set; }
            public string EntityToken { get; set; }
        }
    }

    public class FunctionExecutionContext : FunctionExecutionContext<object>
    {
    }
}
