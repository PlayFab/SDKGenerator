using System;
using System.Runtime.Serialization;

namespace PlayFab
{
    /// <summary>
    /// Base class for PlayFab exceptions
    /// </summary>
    [Serializable]
    public class PlayFabException : Exception
    {
        public PlayFabException() { }

        public PlayFabException(string message)
            : base(message) { }

        public PlayFabException(string message, Exception inner)
            : base(message, inner) { }

        protected PlayFabException(SerializationInfo info, StreamingContext context)
            : base(info, context) { }
    }

    /// <summary>
    /// Base class for PlayFab exceptions caused by incorrect settings
    /// </summary>
    [Serializable]
    public class PlayFabSettingsException : PlayFabException
    {
        public PlayFabSettingsException(string message)
            : base(message) { }

        protected PlayFabSettingsException(SerializationInfo info, StreamingContext context)
            : base(info, context) { }
    }

    /// <summary>
    /// Exception that occurs when call to PlayFab APIs is made while PlayFabSettings.DeveloperSecretKey is not set
    /// </summary>
    [Serializable]
    public class DeveloperSecretKeyNotSetException : PlayFabSettingsException
    {
        private const string ErrorText = "Must have PlayFabSettings.DeveloperSecretKey set to call this method";

        public DeveloperSecretKeyNotSetException()
            : base(ErrorText) { }

        protected DeveloperSecretKeyNotSetException(SerializationInfo info, StreamingContext context)
            : base(info, context) { }
    }
}
