using System;
using System.Collections.Generic;
using PlayFab.Authentication.Strategies;
using PlayFab.ClientModels;
using UnityEngine;
using EntityKey = PlayFab.AuthenticationModels.EntityKey;

namespace PlayFab
{
    /// <summary>
    /// Supported Authentication types
    /// Note: Add types to there to support more AuthTypes
    /// See - https://api.playfab.com/documentation/client#Authentication
    /// </summary>
    public enum AuthTypes
    {
        None,
        Silent,
        EmailAndPassword,
        UsernameAndPassword,
        GooglePlayGames,
        Facebook,
        FacebookInstantGames,
        GameCenter,
        Kongregate,
        NintendoSwitch,
        XBoxLive,
        PlayStation,
        OpenId,
        WindowsHello,
        Twitch,
        Steam
    }

    public class PlayFabAuthService
    {
        // Events to subscribe to for this service
        public delegate void DisplayAuthenticationEvent();
        public event DisplayAuthenticationEvent OnDisplayAuthentication;

        public delegate void LoginSuccessEvent(LoginResult success);
        public event LoginSuccessEvent OnLoginSuccess;

        public delegate void PlayFabErrorEvent(PlayFabError error);
        public event PlayFabErrorEvent OnPlayFabError;

        public delegate void PlayFabLink(AuthTypes authType, PlayFabError error = null);
        public event PlayFabLink OnPlayFabLink;
        public event PlayFabLink OnPlayFabUnlink;

        public string Email;
        public string Username;
        public string Password;
        public GetPlayerCombinedInfoRequestParams InfoRequestParams;
        public bool ForceLink;
        
        public string AuthTicket;
        public string OpenIdConnectionId;
        public string WindowsHelloChallengeSignature;
        public string WindowsHelloPublicKeyHint;
        
        public string PlayFabId { get; private set; }
        public string SessionTicket { get; private set; }
        public static EntityKey EntityToken { get; private set; }
        public PlayFabAuthenticationContext AuthenticationContext { get; private set; }

        private const string _LoginRememberKey = "PlayFabLoginRemember";
        private const string _PlayFabRememberMeIdKey = "PlayFabIdPassGuid";
        private const string _PlayFabAuthTypeKey = "PlayFabAuthType";

        public bool RememberMe
        {
            get { return PlayerPrefs.GetInt(_LoginRememberKey, 0) != 0; }
            set { PlayerPrefs.SetInt(_LoginRememberKey, value ? 1 : 0); }
        }

        /// <summary>
        /// Remember the type of authenticate for the user
        /// </summary>
        public AuthTypes AuthType
        {
            get { return (AuthTypes) PlayerPrefs.GetInt(_PlayFabAuthTypeKey, 0); }
            set { PlayerPrefs.SetInt(_PlayFabAuthTypeKey, (int) value); }
        }

        /// <summary>
        /// Generated Remember Me ID
        /// Pass Null for a value to have one auto-generated.
        /// </summary>
        public string RememberMeId
        {
            get { return PlayerPrefs.GetString(_PlayFabRememberMeIdKey, ""); }
            set
            {
                var guid = string.IsNullOrEmpty(value) ? Guid.NewGuid().ToString() : value;
                PlayerPrefs.SetString(_PlayFabRememberMeIdKey, guid);
            }
        }

        private static readonly Dictionary<AuthTypes, IAuthenticationStrategy> AuthStrategies = new Dictionary<AuthTypes, IAuthenticationStrategy>();

        static PlayFabAuthService()
        {
            AuthStrategies.Add(AuthTypes.None, null);
            AuthStrategies.Add(AuthTypes.Silent, new SilentAuthStrategy());
            AuthStrategies.Add(AuthTypes.EmailAndPassword, new EmailPasswordAuthStrategy());
            AuthStrategies.Add(AuthTypes.UsernameAndPassword, new UsernamePasswordAuthStrategy());
            AuthStrategies.Add(AuthTypes.GooglePlayGames, new GooglePlayGamesAuthStrategy());
            AuthStrategies.Add(AuthTypes.Facebook, new FacebookAuthStrategy());
            AuthStrategies.Add(AuthTypes.FacebookInstantGames, new FacebookInstantGameAuthStrategy());
            AuthStrategies.Add(AuthTypes.GameCenter, new GameCenterAuthStrategy());
            AuthStrategies.Add(AuthTypes.Kongregate, new KongregateAuthStrategy());
            AuthStrategies.Add(AuthTypes.NintendoSwitch, new NintendoSwitchAuthStrategy());
            AuthStrategies.Add(AuthTypes.XBoxLive, new XBoxLiveAuthStrategy());
            AuthStrategies.Add(AuthTypes.PlayStation, new PlayStationAuthStrategy());
            AuthStrategies.Add(AuthTypes.OpenId, new OpenIdAuthStrategy());
            AuthStrategies.Add(AuthTypes.WindowsHello, new WindowsHelloAuthStrategy());
            AuthStrategies.Add(AuthTypes.Twitch, new TwitchAuthStrategy());
            AuthStrategies.Add(AuthTypes.Steam, new SteamAuthStrategy());
        }

        public bool IsLoggedIn()
        {
            return AuthenticationContext != null;
        }

        public void ClearRememberMe()
        {
            PlayerPrefs.DeleteKey(_LoginRememberKey);
            PlayerPrefs.DeleteKey(_PlayFabRememberMeIdKey);
        }

        /// <summary>
        /// Kick off the authentication process by specific authtype.
        /// </summary>
        /// <param name="authType"></param>
        public void Authenticate(AuthTypes authType)
        {
            AuthType = authType;
            Authenticate();
        }

        public void Authenticate()
        {
            var authType = AuthType;

            if (authType == AuthTypes.None)
            {
                if(OnDisplayAuthentication != null)
                    OnDisplayAuthentication.Invoke();
                return;
            }

            var auth = AuthStrategies[authType];
            if (auth == null)
            {
                Debug.LogError("Unhandled auth type: " + authType);
                return;
            }

            auth.Authenticate(this, resultCallback =>
            {
                // Store Identity and session
                AuthenticationContext = resultCallback.AuthenticationContext;
                PlayFabId = resultCallback.PlayFabId;
                SessionTicket = resultCallback.SessionTicket;

                EntityToken = new EntityKey
                {
                    Id = resultCallback.EntityToken.Entity.Id,
                    Type = resultCallback.EntityToken.Entity.Type
                };

                // check if we want to get this callback directly or send to event subscribers.
                if (OnLoginSuccess != null)
                    OnLoginSuccess.Invoke(resultCallback); // report login result back to the subscriber
            }, errorCallback =>
            {
                // report error back to the subscriber
                if (OnPlayFabError != null)
                    OnPlayFabError.Invoke(errorCallback);
                else Debug.LogError(errorCallback.GenerateErrorReport());
            });
        }

        internal void InvokeLink(AuthTypes linkType, PlayFabError error = null)
        {
            if(OnPlayFabLink != null)
                OnPlayFabLink.Invoke(linkType, error);
        }

        internal void InvokeUnlink(AuthTypes unlinkType, PlayFabError error = null)
        {
            if(OnPlayFabUnlink != null)
                OnPlayFabUnlink.Invoke(unlinkType, error);
        }

        internal void InvokeDisplayAuthentication()
        {
            if (OnDisplayAuthentication != null)
                OnDisplayAuthentication.Invoke();
        }

        public void Link(AuthTypes linkType)
        {
            var auth = AuthStrategies[linkType];
            if (auth == null)
            {
                Debug.LogError("Unhandled link type: " + linkType);
                return;
            }
            
            auth.Link(this);
        }

        public void Unlink(AuthTypes unlinkType)
        {
            var auth = AuthStrategies[unlinkType];
            if (auth == null)
            {
                Debug.LogError("Unhandled unlink type: " + unlinkType);
                return;
            }
            
            auth.Unlink(this);
        }
    }
}