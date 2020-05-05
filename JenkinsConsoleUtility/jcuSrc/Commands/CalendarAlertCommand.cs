using JenkinsConsoleUtility.Util;
using PlayFab;
using System;
using System.Collections.Generic;
using System.IO;

namespace JenkinsConsoleUtility.jcuSrc.Commands
{
    public class CalendarAlertCommand : ICommand
    {
        private class Alert
        {
#pragma warning disable 0649
            public string date;
            public string name;
            public int alertDays;
#pragma warning restore 0649

            public DateTime GetDate() { return DateTime.Parse(date); }
        }

        private static readonly string[] MyCommandKeys = { "alert", "calendar", "calendaralert" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        private readonly ISerializerPlugin json;

        public CalendarAlertCommand()
        {
            json = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
        }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            var jsonInput = GetJsonInput(argsLc);
            var alerts = json.DeserializeObject<List<Alert>>(jsonInput);
            var todayStr = DateTime.UtcNow.ToShortDateString();
            var today = DateTime.Parse(todayStr);
            var fixedAlertDays = GetFixedAlertDays(argsLc);

            List<string> expiredAlerts = new List<string>();
            List<string> warningAlerts = new List<string>();

            foreach (var eachAlert in alerts)
            {
                var expireTime = eachAlert.GetDate();
                var alertDays = fixedAlertDays ?? eachAlert.alertDays;
                var alertTime = expireTime - TimeSpan.FromDays(alertDays);

                if (today >= expireTime)
                    expiredAlerts.Add("Expired alert: " + eachAlert.name + " on: " + eachAlert.date);
                else if (today >= alertTime)
                    warningAlerts.Add("Approaching deadline: " + eachAlert.name + " on: " + eachAlert.date);
            }

            JcuUtil.FancyWriteToConsole(ConsoleColor.White, "\n\n================================================");
            foreach (var eachWarning in warningAlerts)
                JcuUtil.FancyWriteToConsole(ConsoleColor.Yellow, eachWarning);
            foreach (var eachAlert in expiredAlerts)
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, eachAlert);

            if (warningAlerts.Count + expiredAlerts.Count == 0)
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Green, "No Calendar alerts");
            }
            JcuUtil.FancyWriteToConsole(ConsoleColor.White, "================================================\n\n");

            // Strictly speaking, we want to fail the job if there's any alerts at all.
            return warningAlerts.Count + expiredAlerts.Count;
        }

        private int? GetFixedAlertDays(Dictionary<string, string> argsLc)
        {
            string alertDaysStr;
            JenkinsConsoleUtility.TryGetArgVar(out alertDaysStr, argsLc, "alertDays");
            int alertDays;
            if (int.TryParse(alertDaysStr, out alertDays))
                return alertDays;

            return null;
        }

        private string GetJsonInput(Dictionary<string, string> argsLc)
        {
            var calendarPath = JenkinsConsoleUtility.GetArgVar(argsLc, "calendarPath");
            if (!File.Exists(calendarPath))
            {
                var workspacePath = JenkinsConsoleUtility.GetArgVar(argsLc, "WORKSPACE");
                calendarPath = Path.Combine(workspacePath, "JenkinsSdkSetupScripts/JenkinsScripts/CalendarAlerts/calendarAlerts.json");
                if (!File.Exists(calendarPath))
                {
                    return null;
                }
            }

            return File.ReadAllText(calendarPath);
        }
    }
}
