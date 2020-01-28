using PlayFab;
using PlayFab.UUnit;
using PlayFab.ClientModels;
using System;
using System.IO;
using System.Linq.Expressions;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Xamarin.Forms;

namespace XamarinTestRunner
{
    public partial class MainPage : ContentPage
    {
        private bool _onCompleted;

        public MainPage()
        {
            InitializeComponent();
            RunTests(null, null);
        }

        private void RunTests(object sender, EventArgs e)
        {
            var originalButtonText = RunTestsButton.Text;
            RunTestsButton.Text = "running tests...";
            RunTestsButton.Clicked -= RunTests;

            Task.Run(() =>
            {
                var testInputs = GetTestTitleData();
                try
                {
                    UUnitIncrementalTestRunner.Start(true, null, testInputs, OnComplete);
                }
                catch (Exception exception)
                {
                    DisplayException(exception);
                    return;
                }

                while (!UUnitIncrementalTestRunner.SuiteFinished)
                {
                    try
                    {
                        UUnitIncrementalTestRunner.Tick();
                    }
                    catch (Exception exception)
                    {
                        DisplayException(exception);
                        return;
                    }
                }

                Device.BeginInvokeOnMainThread(() =>
                {
                    WriteConsoleColor(UUnitIncrementalTestRunner.Summary);
                    TestResultStack.Children.Add(new BoxView {HeightRequest = 10, Color = Color.White});
                });

                // Wait for OnComplete
                var timeout = DateTime.UtcNow + TimeSpan.FromSeconds(30);
                while (!_onCompleted && DateTime.UtcNow < timeout)
                    Thread.Sleep(100);

                Device.BeginInvokeOnMainThread(() =>
                {
                    WriteConsoleColor("Done!", UUnitIncrementalTestRunner.AllTestsPassed ? Color.Green : Color.Red);
                });

                Thread.Sleep(5000);

                Device.BeginInvokeOnMainThread(() =>
                {
                    Thread.CurrentThread.Abort();
                });

            });
        }

        private static TestTitleData GetTestTitleData()
        {
            var assembly = IntrospectionExtensions.GetTypeInfo(typeof(MainPage)).Assembly;
            var stream = assembly.GetManifestResourceStream("XamarinTestRunner.testTitleData.json");
            string testInputsFile;
            using (var reader = new StreamReader(stream))
                testInputsFile = reader.ReadToEnd();
            var testInputs = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject<TestTitleData>(testInputsFile);
            return testInputs;
        }

        private void OnComplete(PlayFabResult<ExecuteCloudScriptResult> result)
        {
            Device.BeginInvokeOnMainThread(() =>
            {
                WriteConsoleColor(
                    "Save to CloudScript result for: " + PlayFabSettings.BuildIdentifier + " => " +
                    UUnitIncrementalTestRunner.PfClient?.authenticationContext?.PlayFabId, Color.Gray);
                if (result.Error != null)
                    WriteConsoleColor(result.Error.GenerateErrorReport(), Color.Red);
                else if (result.Result != null)
                    WriteConsoleColor("Successful!", Color.Green);
            });
            _onCompleted = true;
        }

        private void WriteConsoleColor(string msg = null, Color textColor = default(Color))
        {
            if (string.IsNullOrEmpty(msg))
                return;

            if (textColor.IsDefault)
                textColor = Color.Black;
            TestResultStack.Children.Add(new Label {Text = msg, TextColor = textColor});
        }

        private void DisplayException(Exception e)
        {
            Device.BeginInvokeOnMainThread(() =>
                WriteConsoleColor(e.Message + "\n" + e.StackTrace, Color.Orange));
        }
    }
}
