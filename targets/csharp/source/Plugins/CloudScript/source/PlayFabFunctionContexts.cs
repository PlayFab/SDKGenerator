/////////////////////////////////////////////////////////////////////////////////////////////////
/// THIS PLUGIN IS CURRENTLY IN A BETA STATE MEANT TO ONLY BE USED BY PRIVATE PREVIEW CUSTOMERS.
/// DO NOT RELY ON THE FOLLOWING CODE FOR USE ALONGSIDE PRODUCTION READY CODE.
/// THIS FILE IS SUBJECT TO CHANGE AT ANY TIME.
/////////////////////////////////////////////////////////////////////////////////////////////////
#if NETCOREAPP2_0
namespace PlayFab.Plugins.CloudScript
{
    using PlayFab.Json;
    using System;
    using System.Collections.Generic;
    using System.Net.Http;
    using System.Threading.Tasks;

    /// <summary>
    /// Used for extracting the data fields incoming as payload to Azure Functions into their respective objects. 
    /// Meant to be used with basic HTTP based Azure Functions.
    /// Provides  fields through ApiSettings and AuthenticationContext, the profile of the caller, as well as the 
    /// arguments passed to the execution request.
    /// </summary>
    /// <typeparam name="TFunctionArgument">Type of FunctionArgument</typeparam>
    public class FunctionContext<TFunctionArgument>
    {
        public PlayFabApiSettings ApiSettings { get; private set; }

        public PlayFabAuthenticationContext AuthenticationContext { get; set; }

        public ProfilesModels.EntityProfileBody CallerEntityProfile { get; set; }

        public TFunctionArgument FunctionArgument { get; set; }

        public string CurrentPlayerId { get; set; }

        protected FunctionContext() { }

        /// <summary>
        /// Creates a new <c>FunctionContext</c> out of the incoming request to an Azure Function.
        /// </summary>
        /// <param name="request">The request incoming to an Azure Function from the PlayFab server</param>
        /// <returns>A new populated <c>FunctionContext</c> instance</returns>
        public static async Task<FunctionContext<TFunctionArgument>> Create(HttpRequestMessage request)
        {
            using (var content = request.Content) 
            {
                var body = await content.ReadAsStringAsync();
                var contextInternal = Json.PlayFabSimpleJson.DeserializeObject<FunctionContextInternal>(body);
                var settings = new PlayFabApiSettings
                {
                    TitleId = contextInternal.TitleAuthenticationContext.Id,
                    DeveloperSecretKey = Environment.GetEnvironmentVariable("PLAYFAB_DEV_SECRET_KEY", EnvironmentVariableTarget.Process)
                };

                var authContext = new PlayFabAuthenticationContext
                {
                    EntityToken = contextInternal.TitleAuthenticationContext.EntityToken
                };

                return new FunctionContext<TFunctionArgument>()
                {
                    ApiSettings = settings,
                    CallerEntityProfile = contextInternal.CallerEntityProfile,
                    FunctionArgument = contextInternal.FunctionArgument,
                    AuthenticationContext = authContext,
                    CurrentPlayerId = contextInternal.CallerEntityProfile.Lineage.TitlePlayerAccountId
                };
            }
        }

        private class FunctionContextInternal
        {
            public TitleAuthenticationContext TitleAuthenticationContext { get; set; }

            public ProfilesModels.EntityProfileBody CallerEntityProfile { get; set; }

            public TFunctionArgument FunctionArgument { get; set; }
        }
    }

    public class FunctionContext : FunctionContext<object>
    {
    }

    /// <summary>
    /// Used for extracting the data fields incoming as payload to Azure Functions into their respective objects. 
    /// Meant to be used with Player PlayStream based Azure Functions
    /// Provides  fields through ApiSettings and AuthenticationContext, the profile of the caller, as well as the 
    /// arguments passed to the execution request.
    /// </summary>
    /// <typeparam name="TFunctionArgument">Type of FunctionArgument</typeparam>
    public class FunctionPlayerPlayStreamContext<TFunctionArgument>
    {
        public PlayFabApiSettings ApiSettings { get; private set; }

        public PlayFabAuthenticationContext AuthenticationContext { get; set; }

        public PlayStreamEventEnvelope PlayStreamEventEnvelope { get; set; }

        public ServerModels.PlayerProfile PlayerProfile { get; set; }

        public TFunctionArgument FunctionArgument { get; set; }

        public string CurrentPlayerId { get; set; }

        protected FunctionPlayerPlayStreamContext() { }

        /// <summary>
        /// Creates a new <c>FunctionPlayerPlayStreamContext</c> out of the incoming request to an Azure Function.
        /// </summary>
        /// <param name="request">The request incoming to an Azure Function from the PlayFab server</param>
        /// <returns>A new populated <c>FunctionPlayerPlayStreamContext</c> instance</returns>
        public static async Task<FunctionPlayerPlayStreamContext<TFunctionArgument>> Create(HttpRequestMessage request)
        {
            using (var content = request.Content)
            {
                var body = await content.ReadAsStringAsync();
                var contextInternal = PlayFabSimpleJson.DeserializeObject<FunctionPlayerPlayStreamContextInternal>(body);
                var settings = new PlayFabApiSettings
                {
                    TitleId = contextInternal.TitleAuthenticationContext.Id,
                    DeveloperSecretKey = Environment.GetEnvironmentVariable("PLAYFAB_DEV_SECRET_KEY", EnvironmentVariableTarget.Process)
                };

                var authContext = new PlayFabAuthenticationContext
                {
                    EntityToken = contextInternal.TitleAuthenticationContext.EntityToken
                };

                return new FunctionPlayerPlayStreamContext<TFunctionArgument>()
                {
                    ApiSettings = settings,
                    AuthenticationContext = authContext,
                    PlayStreamEventEnvelope = contextInternal.PlayStreamEventEnvelope,
                    PlayerProfile = contextInternal.PlayerProfile,
                    FunctionArgument = contextInternal.FunctionArgument,
                    CurrentPlayerId = contextInternal.PlayerProfile.PlayerId
                };
            }
        }

        private class FunctionPlayerPlayStreamContextInternal
        {
            public TFunctionArgument FunctionArgument { get; set; }

            public PlayStreamEventEnvelope PlayStreamEventEnvelope { get; set; }

            public ServerModels.PlayerProfile PlayerProfile { get; set; }

            public TitleAuthenticationContext TitleAuthenticationContext { get; set; }
        }
    }

    /// <summary>
    /// Used for extracting the data fields incoming as payload to Azure Functions into their respective objects. 
    /// Meant to be used with task based Azure Functions.
    /// Provides  fields through ApiSettings and AuthenticationContext, the profile of the caller, as well as the 
    /// arguments passed to the execution request.
    /// </summary>
    /// <typeparam name="TFunctionArgument">Type of FunctionArgument</typeparam>
    public class FunctionTaskContext<TFunctionArgument>
    {
        public PlayFabApiSettings ApiSettings { get; private set; }

        public PlayFabAuthenticationContext AuthenticationContext { get; set; }

        public NameIdentifier ScheduledTaskNameId { get; set; }

        public Stack<PlayStreamEventHistory> EventHistory { get; set; }

        public TFunctionArgument FunctionArgument { get; set; }

        protected FunctionTaskContext() { }

        /// <summary>
        /// Creates a new <c>FunctionTaskContext</c> out of the incoming request to an Azure Function.
        /// </summary>
        /// <param name="request">The request incoming to an Azure Function from the PlayFab server</param>
        /// <returns>A new populated <c>FunctionTaskContext</c> instance</returns>
        public static async Task<FunctionTaskContext<TFunctionArgument>> Create(HttpRequestMessage request)
        {
            using (var content = request.Content)
            {
                var body = await content.ReadAsStringAsync();
                var contextInternal = PlayFabSimpleJson.DeserializeObject<FunctionTaskContextInternal>(body);
                var settings = new PlayFabApiSettings
                {
                    TitleId = contextInternal.TitleAuthenticationContext.Id,
                    DeveloperSecretKey = Environment.GetEnvironmentVariable("PLAYFAB_DEV_SECRET_KEY", EnvironmentVariableTarget.Process)
                };

                var authContext = new PlayFabAuthenticationContext
                {
                    EntityToken = contextInternal.TitleAuthenticationContext.EntityToken
                };

                return new FunctionTaskContext<TFunctionArgument>()
                {
                    ApiSettings = settings,
                    AuthenticationContext = authContext,
                    ScheduledTaskNameId = contextInternal.ScheduledTaskNameId,
                    EventHistory = contextInternal.EventHistory,
                    FunctionArgument = contextInternal.FunctionArgument
                };
            }
        }

        private class FunctionTaskContextInternal
        {
            public NameIdentifier ScheduledTaskNameId { get; set; }

            public Stack<PlayStreamEventHistory> EventHistory { get; set; }

            public TitleAuthenticationContext TitleAuthenticationContext { get; set; }

            public TFunctionArgument FunctionArgument { get; set; }
        }
    }

    /// <summary>
    /// Identifier by either name or ID. Note that a name may change due to renaming,
    /// or reused after being deleted. ID is immutable and unique.
    /// </summary>
    public class NameIdentifier
    {
        /// <summary>
        /// Name Identifier, if present
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Id Identifier, if present
        /// </summary>
        public string Id { get; set; }
    }

    public class PlayStreamEventEnvelope
    {
        public string EntityId { get; set; }
        public string EntityType { get; set; }
        public string EventName { get; set; }
        public string EventNamespace { get; set; }
        public string EventData { get; set; }
        public string EventSettings { get; set; }
    }

    public class PlayStreamEventHistory
    {
        public string ParentTriggerId { get; set; }

        public string ParentEventId { get; set; }

        public bool TriggeredEvents { get; set; }
    }

    /// <summary>
    /// Structure that represents the authentication context provided over the wire
    /// by PlayFab MainServer for a title. Contains a Title ID and a Title Entity Token.
    /// </summary>
    internal class TitleAuthenticationContext
    {
        /// <summary>
        /// Title Id
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Title Entity Token
        /// </summary>
        public string EntityToken { get; set; }
    }
}
#endif
