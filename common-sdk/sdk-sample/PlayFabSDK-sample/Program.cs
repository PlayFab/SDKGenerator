using System;
using System.Threading;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;

public static class Program
{
    private static bool _running = true;
    static void Main(string[] args)
    {
        PlayFabSettings.TitleId = "6430"; // Please change this value to your own titleId from PlayFab Game Manager

        var request = new LoginWithCustomIDRequest { CustomId = "GettingStartedGuide", CreateAccount = true };
        var loginTask = PlayFabClientAPI.LoginWithCustomIDAsync(request);
        loginTask.Wait();

        // If you want a synchronous ressult, you can call loginTask.Wait() - Note, this will halt the program until the function returns

        while (_running)
        {
            if (loginTask.IsCompleted) // You would probably want a more sophisticated way of tracking pending async API calls in a real game
            {
                OnLoginComplete(loginTask);
            }

            // Presumably this would be your main game loop, doing other things
            Thread.Sleep(1);
        }

        Console.WriteLine("Done! Press any key to close");
        Console.ReadKey(); // This halts the program and waits for the user
    }

    private static void OnLoginComplete(Task<PlayFabResult<LoginResult>> taskResult)
    {
        var apiError = taskResult.Result.Error;
        var apiResult = taskResult.Result.Result;

        if (apiError != null)
        {
            Console.ForegroundColor = ConsoleColor.Red; // Make the error more visible
            Console.WriteLine("Something went wrong with your first API call.  :(");
            Console.WriteLine("Here's some debug information:");
            Console.WriteLine(PlayFabUtil.GenerateErrorReport(apiError));
            Console.ForegroundColor = ConsoleColor.Gray; // Reset to normal
        }
        else if (apiResult != null)
        {
            Console.WriteLine("Congratulations, you made your first successful API call!");

            // send some telemetry event
            WriteClientPlayerEventRequest request = new WriteClientPlayerEventRequest()
            {
                EventName = "Hello",
                Body = new System.Collections.Generic.Dictionary<string, object>
                {
                    { "propA", "value of prop A" },
                    { "propB", "7" }
                }
            };

            var response = PlayFabClientAPI.WritePlayerEventAsync(request);
            response.Wait();
        }

        _running = false; // Because this is just an example, successful login triggers the end of the program
    }
}