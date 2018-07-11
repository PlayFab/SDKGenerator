using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using PlayFab.Json;
using PlayFab.UUnit;

namespace UnittestRunner
{
    static class UUnitTestRunner
    {
        private static bool _onCompleted = false;
        public class CsSaveRequest
        {
            public string customId;
            public TestSuiteReport[] testReport;
        }

        private static int Main(string[] args)
        {
            PlayFabApiTest.CreateCustomSerializerPlugin = (serializeAction, deserializeAction) =>
            {
                return new CustomSerializerPlugin() { SerializeAction = serializeAction, DeserializeAction = deserializeAction };
            };

            PlayFabApiTest.CreateCustomTransportPlugin = () =>
            {
                return new CustomTransportPlugin();
            };

            var testInputs = GetTestTitleData(args);
            UUnitIncrementalTestRunner.Start(true, null, testInputs, OnComplete);
            while (!UUnitIncrementalTestRunner.SuiteFinished)
                UUnitIncrementalTestRunner.Tick();

            Console.WriteLine(UUnitIncrementalTestRunner.Summary);
            Console.WriteLine();

            // Wait for OnComplete
            var timeout = DateTime.UtcNow + TimeSpan.FromSeconds(30);
            while (!_onCompleted && DateTime.UtcNow < timeout)
                Thread.Sleep(100);

            return Pause(UUnitIncrementalTestRunner.AllTestsPassed ? 0 : 1);
        }

        private static void WriteConsoleColor(string msg = null, ConsoleColor textColor = ConsoleColor.White)
        {
            Console.ForegroundColor = textColor;
            if (!string.IsNullOrEmpty(msg))
                Console.WriteLine(msg);
            Console.ForegroundColor = ConsoleColor.White;
        }

        private static int Pause(int code)
        {
            WriteConsoleColor("Done! Press any key to close", code == 0 ? ConsoleColor.Green : ConsoleColor.Red);
            try
            {
                Console.ReadKey();
            }
            catch (InvalidOperationException)
            {
                // ReadKey fails when run from inside of Jenkins, so just ignore it.
            }
            return code;
        }

        private static TestTitleData GetTestTitleData(string[] args)
        {
            TestTitleData testInputs = null;
            string filename = null;
            for (var i = 0; i < args.Length; i++)
                if (args[i] == "-testInputsFile" && (i + 1) < args.Length)
                    filename = args[i + 1];
            if (string.IsNullOrEmpty(filename))
                filename = Environment.GetEnvironmentVariable("PF_TEST_TITLE_DATA_JSON");
            if (File.Exists(filename))
            {
                var testInputsFile = File.ReadAllText(filename);
                testInputs = JsonWrapper.DeserializeObject<TestTitleData>(testInputsFile);
            }
            else
            {
                WriteConsoleColor("Loading testSettings file failed: " + filename, ConsoleColor.Red);
                WriteConsoleColor("From: " + Directory.GetCurrentDirectory(), ConsoleColor.Red);
            }
            return testInputs;
        }

        private static void OnComplete(PlayFabResult<ExecuteCloudScriptResult> result)
        {
            WriteConsoleColor("Save to CloudScript result for: " + PlayFabSettings.BuildIdentifier + " => " + PlayFabApiTest.PlayFabId, ConsoleColor.Gray);
            if (result.Error != null)
                WriteConsoleColor(result.Error.GenerateErrorReport(), ConsoleColor.Red);
            else if (result.Result != null)
                WriteConsoleColor("Successful!", ConsoleColor.Green);
            _onCompleted = true;
        }
    }

    public class CustomSerializerPlugin : ISerializerPlugin
    {
        public Func<object, string> SerializeAction;
        public Func<string, Type, object> DeserializeAction;

        public T DeserializeObject<T>(string serialized)
        {
            if (DeserializeAction != null)
            {
                return (T)DeserializeAction(serialized, typeof(T));
            }

            throw new NotImplementedException();
        }

        public T DeserializeObject<T>(string serialized, object serializerStrategy)
        {
            throw new NotImplementedException();
        }

        public object DeserializeObject(string serialized)
        {
            throw new NotImplementedException();
        }

        public string SerializeObject(object obj)
        {
            if (SerializeAction != null)
            {
                return SerializeAction(obj);
            }

            throw new NotImplementedException();
        }

        public string SerializeObject(object obj, object serializerStrategy)
        {
            throw new NotImplementedException();
        }
    }

    public class CustomTransportPlugin : ITransportPlugin
    {
        public Task<object> DoPost(string urlPath, object request, Dictionary<string, string> headers)
        {
            throw new NotImplementedException();
        }
    }
}
