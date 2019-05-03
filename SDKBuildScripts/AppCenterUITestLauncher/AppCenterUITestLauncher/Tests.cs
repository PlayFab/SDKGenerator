﻿// Copyright (C) Microsoft Corporation. All rights reserved.

using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using Xamarin.UITest;
using Xamarin.UITest.Utils.Integration;
using Xamarin.UITest.Queries;

namespace XamarinUITestExperiment
{
    [TestFixture(Platform.Android)]
    [TestFixture(Platform.iOS)]
    public class Tests
    {
        IApp app;
        Platform platform;

        public Tests(Platform platform)
        {
            this.platform = platform;
        }

        [SetUp]
        public void BeforeEachTest()
        {
            app = AppInitializer.StartApp(platform);

        }

        //[Test]
        //public void TestRepl()
        //{
        //    app.Repl();
        //}
        
        [Test]
        public void WaitAwhile()
        {
            try
            {
                while (app.Query(x => x.Index(0)).Count() > 0)
                {
                    System.Threading.Thread.Sleep(500);
                }
            }
            catch(System.Exception e) {
                Console.WriteLine("Caught Exception: " + e.Message);
                return;
            }
                       
        }
    }
}
