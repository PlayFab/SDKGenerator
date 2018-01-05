#if !DISABLE_PLAYFABCLIENT_API
using System;
using System.Runtime.Serialization;

namespace PlayFab
{
    /// <summary>
    /// Exception that occurs when call to PlayFabClientAPI is made and client is not logged in
    /// </summary>
    [Serializable]
    public class ClientNotLoggedInException : PlayFabException
    {
        private const string ErrorText = "Must be logged in to call this method";

        public ClientNotLoggedInException()
            : base(ErrorText) { }

        protected ClientNotLoggedInException(SerializationInfo info, StreamingContext context)
            : base(info, context) { }
    }

    /// <summary>
    /// Exception that occurs when call to PlayFabClientAPI is made and PlayFabSettings.TitleId is not set
    /// </summary>
    [Serializable]
    public class TitleIdNotSetException : PlayFabSettingsException
    {
        private const string ErrorText = "Must have PlayFabSettings.TitleId set to call this method";

        public TitleIdNotSetException()
            : base(ErrorText) { }

        protected TitleIdNotSetException(SerializationInfo info, StreamingContext context)
            : base(info, context) { }
    }
}
#endif
