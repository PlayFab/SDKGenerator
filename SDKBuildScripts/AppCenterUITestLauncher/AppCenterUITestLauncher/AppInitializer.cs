// Copyright (C) Microsoft Corporation. All rights reserved.

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
                return ConfigureApp.Android.InstalledApp("com.microsoft.playfab.sdktest")
#if USE_LOCAL_KEYSTORE
                    .KeyStore("D:\\uitest.keystore","uitest","uitest","uitest")
#endif
                    .EnableLocalScreenshots()
                    .StartApp();
            }
            else if (platform == Platform.iOS)
            {
                return ConfigureApp.iOS.InstalledApp("com.microsoft.playfab.sdktest")
                    .EnableLocalScreenshots()
                    .StartApp();
            }
            throw new PlatformNotSupportedException("Only iOS and Android are supported by this UITest assembly! This instance was started for " + platform.ToString());
        }
    }
}
