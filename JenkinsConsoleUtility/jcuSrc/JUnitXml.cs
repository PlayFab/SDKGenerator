using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using Newtonsoft.Json;
using PlayFab;

namespace JenkinsConsoleUtility
{
    public static class JUnitXml
    {
        // Temp internal vars - not threadsafe
        private static List<TestSuite> outputReport;
        private static List<TestSuite> curReport;
        private static TestSuite curSuite;
        private static TestCase curTestCase;

        public static List<TestSuite> ParseXmlFile(string filename)
        {
            if (!File.Exists(filename))
                return outputReport;

            string xmlString = File.ReadAllText(filename);

            using (XmlReader reader = XmlReader.Create(new StringReader(xmlString)))
            {
                outputReport = null;
                curReport = null;
                curSuite = null;
                curTestCase = null;

                // Parse the file and display each of the nodes.
                while (reader.Read())
                {
                    switch (reader.NodeType)
                    {
                        case XmlNodeType.XmlDeclaration:
                        case XmlNodeType.Whitespace:
                            break; // We simply accept that this exists, but otherwise don't really process it
                        case XmlNodeType.Element:
                            bool isEmptyElement = reader.IsEmptyElement;
                            ParseElementStart(reader, isEmptyElement);
                            if (isEmptyElement)
                                ParseElementEnd(reader, true);
                            break;
                        case XmlNodeType.Text:
                            TestFinishState tempState;
                            if (Enum.TryParse(reader.Value, true, out tempState))
                                curTestCase.finishState = tempState;
                            else
                                curTestCase.failureText = reader.Value;
                            break;
                        case XmlNodeType.EndElement:
                            ParseElementEnd(reader, false);
                            break;
                        default:
                            throw new Exception("Unexpected xml node: " + reader.NodeType);
                    }
                }
            }

            return outputReport;
        }

        private static void ParseElementStart(XmlReader reader, bool isEmptyElement)
        {
            double tempSeconds;

            switch (reader.Name)
            {
                case ("testsuites"):
                    curReport = new List<TestSuite>();
                    break;
                case ("testsuite"):
                    curSuite = new TestSuite();
                    curSuite.name = reader.GetAttribute("name");
                    int.TryParse(reader.GetAttribute("errors"), out curSuite.errors);
                    int.TryParse(reader.GetAttribute("tests"), out curSuite.tests);
                    int.TryParse(reader.GetAttribute("failures"), out curSuite.failures);
                    int.TryParse(reader.GetAttribute("skipped"), out curSuite.skipped);
                    double.TryParse(reader.GetAttribute("time"), out tempSeconds);
                    curSuite.time = TimeSpan.FromSeconds(tempSeconds);
                    DateTime.TryParseExact(reader.GetAttribute("timestamp"), PlayFabSettings.DATETIME_PARSE_FORMATS, null, System.Globalization.DateTimeStyles.RoundtripKind, out curSuite.timestamp);
                    break;
                case ("properties"):
                    curSuite.properties = new Dictionary<string, string>();
                    break;
                case ("property"):
                    curSuite.properties[reader.GetAttribute("name")] = reader.GetAttribute("value");
                    break;
                case ("testcase"):
                    curTestCase = new TestCase();
                    curTestCase.classname = reader.GetAttribute("classname");
                    curTestCase.name = reader.GetAttribute("name");
                    curTestCase.finishState = isEmptyElement ? TestFinishState.PASSED : TestFinishState.FAILED; // Empty element means no notes about failure, non-empty will almost certainly override this value
                    double.TryParse(reader.GetAttribute("time"), out tempSeconds);
                    curTestCase.time = TimeSpan.FromSeconds(tempSeconds);
                    break;
                case ("failure"):
                    curTestCase.finishState = TestFinishState.FAILED;
                    curTestCase.message = reader.GetAttribute("message");
                    break;
                case ("skipped"):
                    curTestCase.finishState = TestFinishState.SKIPPED;
                    curTestCase.message = reader.GetAttribute("message");
                    break;
                default:
                    throw new Exception("Unexpected element: " + reader.Name);
            }
        }

        private static void ParseElementEnd(XmlReader reader, bool isEmptyElement)
        {
            switch (reader.Name)
            {
                case ("testsuites"):
                    outputReport = curReport;
                    break;
                case ("testsuite"):
                    curReport.Add(curSuite);
                    curSuite = null;
                    break;
                case ("properties"):
                    break;
                case ("property"):
                    break;
                case ("testcase"):
                    if (curSuite.testResults == null)
                        curSuite.testResults = new List<TestCase>();
                    curSuite.testResults.Add(curTestCase);
                    curTestCase = null;
                    break;
                case ("failure"):
                    break;
                case ("skipped"):
                    break;
                default:
                    throw new Exception("Unexpected element: " + reader.Name);
            }
        }

        /// <summary>
        /// Write XML JUnit results file to destinationFile
        /// If the file already exists, merge the results
        /// </summary>
        public static void WriteXmlFile(string destinationFile, List<TestSuite> newReport, bool clearPrevFile)
        {
            if (File.Exists(destinationFile) && !clearPrevFile)
            {
                List<TestSuite> oldReport = ParseXmlFile(destinationFile);
                oldReport.AddRange(newReport);
                newReport = oldReport;
            }

            StringBuilder sb = new StringBuilder();
            string tabbing = "";
            sb.Append(tabbing).Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            sb.Append(tabbing).Append("<testsuites>\n");
            tabbing += "  ";
            foreach (var testSuite in newReport)
            {
                testSuite.AppendAsXml(ref sb, tabbing);
            }
            tabbing = tabbing.Substring(2);
            sb.Append(tabbing).Append("</testsuites>\n");

            JenkinsConsoleUtility.FancyWriteToConsole("Write test results: " + destinationFile, null, ConsoleColor.Gray);
            var output = File.Open(destinationFile, FileMode.Create);
            byte[] buffer = Encoding.UTF8.GetBytes(sb.ToString());
            output.Write(buffer, 0, buffer.Length);
            output.Close();
        }

        public enum TestFinishState
        {
            PASSED, // no xml
            FAILED, // <failure message="testMessage">Assertion failed</failure>
            SKIPPED, // <skipped />
            TIMEDOUT, // <failure message="testMessage">Timed out</failure>
        }

        public class TestSuite
        {
            // Part of the XML spec
            public List<TestCase> testResults;
            public string name;
            public int tests;
            public int failures;
            public int errors;
            public int skipped;
            [JsonConverter(typeof(Util.TimeSpanFloatSeconds))]
            public TimeSpan time;
            public DateTime timestamp;
            public Dictionary<string, string> properties;
            // Jenkernaught Extras
            public string buildIdentifier;

            public void AppendAsXml(ref StringBuilder sb, string tabbing)
            {
                bool isSingleLine = (properties == null || properties.Count == 0)
                                    && (testResults == null || testResults.Count == 0)
                                    && tests == 0
                                    && failures == 0;

                AppendTestSuiteLine(ref sb, isSingleLine, tabbing);
                if (isSingleLine)
                    return; // Nothing else is written if it's a single line

                tabbing += "  ";
                AppendProperties(ref sb, tabbing);
                AppendTestCases(ref sb, tabbing);
                tabbing = tabbing.Substring(2);
                sb.Append(tabbing).Append("</testsuite>\n");
            }

            private void AppendTestSuiteLine(ref StringBuilder sb, bool isSingleLine, string tabbing)
            {
                string suffix = isSingleLine ? " /" : "";
                if (skipped == 0)
                    sb.Append(tabbing).AppendFormat("<testsuite name=\"{0}\" errors=\"{1}\" tests=\"{2}\" failures=\"{3}\" time=\"{4}\" timestamp=\"{5}\"{6}>\n", name, errors, tests, failures, time.TotalSeconds.ToString("0.###"), timestamp.ToString(PlayFabSettings.DATETIME_PARSE_FORMATS[3]), suffix);
                else
                    sb.Append(tabbing).AppendFormat("<testsuite name=\"{0}\" errors=\"{1}\" skipped=\"{2}\" tests=\"{3}\" failures=\"{4}\" time=\"{5}\" timestamp=\"{6}\"{7}>\n", name, errors, skipped, tests, failures, time.TotalSeconds.ToString("0.###"), timestamp.ToString(PlayFabSettings.DATETIME_PARSE_FORMATS[3]), suffix);
            }

            private void AppendProperties(ref StringBuilder sb, string tabbing)
            {
                if (properties == null || properties.Count == 0)
                    return;

                sb.Append(tabbing).Append("<properties>\n");
                tabbing += "  ";
                foreach (var propPair in properties)
                    sb.Append(tabbing).AppendFormat("<property name=\"{0}\" value=\"{1}\" />\n", propPair.Key, propPair.Value);
                tabbing = tabbing.Substring(2);
                sb.Append(tabbing).Append("</properties>\n");
            }

            private void AppendTestCases(ref StringBuilder sb, string tabbing)
            {
                foreach (var testCase in testResults)
                    testCase.AppendAsXml(ref sb, tabbing);
            }
        }

        public class TestCase
        {
            public string classname;
            public string name;
            [JsonConverter(typeof(Util.TimeSpanFloatSeconds))]
            public TimeSpan time;
            // Sub-Fields in the XML spec
            public string message;
            public string failureText; // If undefined, just use finishState
            public TestFinishState finishState;

            public void AppendAsXml(ref StringBuilder sb, string tabbing)
            {
                bool isSingleLine = string.IsNullOrEmpty(message)
                                    && finishState == TestFinishState.PASSED;

                AppendTestCaseLine(ref sb, isSingleLine, tabbing);
                if (isSingleLine)
                    return; // Nothing else is written if it's a single line

                tabbing += "  ";
                if (finishState == TestFinishState.SKIPPED)
                    sb.Append(tabbing).Append("<skipped />\n");
                else if (string.IsNullOrEmpty(failureText))
                    sb.Append(tabbing).AppendFormat("<failure message=\"{0}\">{1}</failure>\n", message, finishState.ToString());
                else
                    sb.Append(tabbing).AppendFormat("<failure message=\"{0}\">{1}</failure>\n", message, failureText);
                tabbing = tabbing.Substring(2);
                sb.Append(tabbing).Append("</testcase>\n");
            }

            private void AppendTestCaseLine(ref StringBuilder sb, bool isSingleLine, string tabbing)
            {
                string suffix = isSingleLine ? " /" : "";
                sb.Append(tabbing).AppendFormat("<testcase classname=\"{0}\" name=\"{1}\" time=\"{2}\"{3}>\n", classname, name, time.TotalSeconds.ToString("0.###"), suffix);
            }
        }
    }
}
