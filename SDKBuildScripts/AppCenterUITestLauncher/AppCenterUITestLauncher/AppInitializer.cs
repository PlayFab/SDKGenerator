﻿// Copyright (C) Microsoft Corporation. All rights reserved.

//enable USE_LOCAL_KEYSTORE to enable REPL interaction on a local development machine.
//#define USE_LOCAL_KEYSTORE

using System;
using Xamarin.UITest;
using Xamarin.UITest.Queries;

namespace XamarinUITestExperiment
{
    public class AppInitializer
    {
        public static IApp StartApp(Platform platform)
        {
            if (platform == Platform.Android)
            {
                return ConfigureApp.Android.InstalledApp("com.PlayFab.Service")
#if USE_LOCAL_KEYSTORE
                    .KeyStore("D:\\uitest.keystore","uitest","uitest","uitest")
#endif
                    .EnableLocalScreenshots()
                    .StartApp();
            }

            //return ConfigureApp.iOS.StartApp();
            throw new PlatformNotSupportedException("Only Android is supported by this UITest assembly! This instance was started for " + platform.ToString());
        }
    }
}