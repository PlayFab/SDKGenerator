using UnityEngine;
using System;
using System.Collections;
using PlayFab;
using strange.extensions.mediation.impl;

public class PlayFabDataStore : View
{
    public string TitleId;
    public WebRequestType RequestType;
    public string PlayFabId;
    public string SessionTicket;
    public string UserName;
    public string Email;
    public string DisplayName;

    public LoginLinkType LinkType;
    public PlatformTypes Platform;
    public string DeviceId;
    public string SteamId;
    public string KongregateId;
    public string GameCenterPlayerId;

    public string FBAccessToken;
    public string KongAuthTicket;
    public string SteamTicket;
    public string GooglePublisherId;
    public string GoogleTicket;

    public DateTime SessionExpires;
}

public enum LoginLinkType {
    None,
    Android,
    Ios,
    Facebook,
    Kongregate,
    Steam,
    Google,
    GameCenter,
    Email,
    Custom
}

public enum PlatformTypes
{
    Android,
    Ios,
    Desktop
}