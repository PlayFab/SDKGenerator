#if ENABLE_PLAYFABADMIN_API
using System;
using UnityEngine;
using System.Collections;
using PlayFab.Internal;

namespace PlayFab
{
    public static partial class PlayFabSettings
    {
        [Obsolete("Use DeveloperSecretKey, this will go away on release of the beta.")]
        public static string AdminDeveloperSecretKey
        {
            set { PlayFabHttp._devKey = value; }
            private get { return PlayFabHttp._devKey; }
        }
    }
}
#endif