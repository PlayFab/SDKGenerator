using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.Serialization;
using JetBrains.Annotations;
using UnityEngine;

namespace PlayFab.Public 
{

    public class PlayFabException : Exception
    {
        private readonly PlayFabExceptionCode _code;

        public PlayFabException(PlayFabExceptionCode code, string message) : base(message)
        {
            _code = code;
        }

        public PlayFabExceptionCode Code
        {
            get { return _code; }
        }

    }

    public enum PlayFabExceptionCode
    {
        TitleNotSet,
        DeveloperKeyNotSet,
        NotLoggedIn
    }
    

}
