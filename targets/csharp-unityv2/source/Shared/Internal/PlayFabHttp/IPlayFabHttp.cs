using System;

namespace PlayFab.Internal
{

    public interface IPlayFabHttp
    {
        void Awake();
        void Update();

        void MakeApiCall<TRequestType, TResultType>(string api, string apiEndpoint, TRequestType request,
            string authType,
            Action<TResultType> resultCallback, Action<PlayFabError> errorCallback, object customData = null);

        int GetPendingMessages();

    }
}