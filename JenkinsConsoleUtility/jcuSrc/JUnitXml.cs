using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using PlayFab;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility
{
    public static class JUnitXml
    {
        // Temp internal vars - not threadsafe
        private static List<TestSuiteReport> outputReport;
        private static List<TestSuiteReport> curReport;
        private static TestSuiteReport _curSuiteReport;
        private static TestCaseReport _curTestCaseReport;

        public static List<TestSuiteReport> ParseXmlFile(string filename)
        {
            if (!File.Exists(filename))
                return outputReport;

            string xmlString = File.ReadAllText(filename);

            using (XmlReader reader = XmlReader.Create(new StringReader(xmlString)))
            {
                outputReport = null;
                curReport = null;
                _curSuiteReport = null;
                _curTestCaseReport = null;

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
                                _curTestCaseReport.finishState = tempState;
                            else
                                _curTestCaseReport.failureText = reader.Value;
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
                    curReport = new List<TestSuiteReport>();
                    break;
                case ("testsuite"):
                    _curSuiteReport = new TestSuiteReport();
                    _curSuiteReport.name = reader.GetAttribute("name");
                    int.TryParse(reader.GetAttribute("errors"), out _curSuiteReport.errors);
                    int.TryParse(reader.GetAttribute("tests"), out _curSuiteReport.tests);
                    int.TryParse(reader.GetAttribute("failures"), out _curSuiteReport.failures);
                    int.TryParse(reader.GetAttribute("skipped"), out _curSuiteReport.skipped);
                    double.TryParse(reader.GetAttribute("time"), out tempSeconds);
                    _curSuiteReport.time = TimeSpan.FromSeconds(tempSeconds);
                    DateTime.TryParseExact(reader.GetAttribute("timestamp"), PlayFabUtil.DefaultDateTimeFormats, null, System.Globalization.DateTimeStyles.RoundtripKind, out _curSuiteReport.timestamp);
                    break;
                case ("properties"):
                    _curSuiteReport.properties = new Dictionary<string, string>();
                    break;
                case ("property"):
                    _curSuiteReport.properties[reader.GetAttribute("name")] = reader.GetAttribute("value");
                    break;
                case ("testcase"):
                    _curTestCaseReport = new TestCaseReport();
                    _curTestCaseReport.classname = reader.GetAttribute("classname");
                    _curTestCaseReport.name = reader.GetAttribute("name");
                    _curTestCaseReport.finishState = isEmptyElement ? TestFinishState.PASSED : TestFinishState.FAILED; // Empty element means no notes about failure, non-empty will almost certainly override this value
                    double.TryParse(reader.GetAttribute("time"), out tempSeconds);
                    _curTestCaseReport.time = TimeSpan.FromSeconds(tempSeconds);
                    break;
                case ("failure"):
                    _curTestCaseReport.finishState = TestFinishState.FAILED;
                    _curTestCaseReport.message = reader.GetAttribute("message");
                    break;
                case ("skipped"):
                    _curTestCaseReport.finishState = TestFinishState.SKIPPED;
                    _curTestCaseReport.message = reader.GetAttribute("message");
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
                    curReport.Add(_curSuiteReport);
                    _curSuiteReport = null;
                    break;
                case ("properties"):
                    break;
                case ("property"):
                    break;
                case ("testcase"):
                    if (_curSuiteReport.testResults == null)
                        _curSuiteReport.testResults = new List<TestCaseReport>();
                    _curSuiteReport.testResults.Add(_curTestCaseReport);
                    _curTestCaseReport = null;
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
        public static int WriteXmlFile(string destinationFile, List<TestSuiteReport> newReport, bool clearPrevFile)
        {
            try
            {
                if (File.Exists(destinationFile) && !clearPrevFile)
                {
                    List<TestSuiteReport> oldReport = ParseXmlFile(destinationFile);
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
                using (var output = File.Open(destinationFile, FileMode.Create))
                {
                    byte[] buffer = Encoding.UTF8.GetBytes(sb.ToString());
                    output.Write(buffer, 0, buffer.Length);
                    output.Close();
                }
            }
            catch (Exception e)
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Failure writing xml:\n" + e, null, ConsoleColor.Red);
                return 1; // Fail
            }
            return 0; // Success
        }

        #region ===== Extension methods for writing test reports to XML =====
        public static void AppendAsXml(this TestSuiteReport self, ref StringBuilder sb, string tabbing)
        {
            bool isSingleLine = (self.properties == null || self.properties.Count == 0)
                                && (self.testResults == null || self.testResults.Count == 0)
                                && self.tests == 0
                                && self.failures == 0;

            self.AppendTestSuiteLine(ref sb, isSingleLine, tabbing);
            if (isSingleLine)
                return; // Nothing else is written if it's a single line

            tabbing += "  ";
            self.AppendProperties(ref sb, tabbing);
            self.AppendTestCases(ref sb, tabbing);
            tabbing = tabbing.Substring(2);
            sb.Append(tabbing).Append("</testsuite>\n");
        }

        private static void AppendTestSuiteLine(this TestSuiteReport self, ref StringBuilder sb, bool isSingleLine, string tabbing)
        {
            string suffix = isSingleLine ? " /" : "";
            if (self.skipped == 0)
                sb.Append(tabbing).AppendFormat("<testsuite name=\"{0}\" errors=\"{1}\" tests=\"{2}\" failures=\"{3}\" time=\"{4}\" timestamp=\"{5}\"{6}>\n", self.name, self.errors, self.tests, self.failures, self.time.TotalSeconds.ToString("0.###"), self.timestamp.ToString(PlayFabUtil.DefaultDateTimeFormats[PlayFabUtil.DEFAULT_UTC_OUTPUT_INDEX]), suffix);
            else
                sb.Append(tabbing).AppendFormat("<testsuite name=\"{0}\" errors=\"{1}\" skipped=\"{2}\" tests=\"{3}\" failures=\"{4}\" time=\"{5}\" timestamp=\"{6}\"{7}>\n", self.name, self.errors, self.skipped, self.tests, self.failures, self.time.TotalSeconds.ToString("0.###"), self.timestamp.ToString(PlayFabUtil.DefaultDateTimeFormats[PlayFabUtil.DEFAULT_UTC_OUTPUT_INDEX]), suffix);
        }

        private static void AppendProperties(this TestSuiteReport self, ref StringBuilder sb, string tabbing)
        {
            if (self.properties == null || self.properties.Count == 0)
                return;

            sb.Append(tabbing).Append("<properties>\n");
            tabbing += "  ";
            foreach (var propPair in self.properties)
                sb.Append(tabbing).AppendFormat("<property name=\"{0}\" value=\"{1}\" />\n", propPair.Key, propPair.Value);
            tabbing = tabbing.Substring(2);
            sb.Append(tabbing).Append("</properties>\n");
        }

        private static void AppendTestCases(this TestSuiteReport self, ref StringBuilder sb, string tabbing)
        {
            foreach (TestCaseReport testCase in self.testResults)
                testCase.AppendAsXml(ref sb, tabbing);
        }

        public static void AppendAsXml(this TestCaseReport self, ref StringBuilder sb, string tabbing)
        {
            bool isSingleLine = string.IsNullOrEmpty(self.message)
                                && self.finishState == TestFinishState.PASSED;

            self.AppendTestCaseLine(ref sb, isSingleLine, tabbing);
            if (isSingleLine)
                return; // Nothing else is written if it's a single line

            tabbing += "  ";
            if (self.finishState == TestFinishState.SKIPPED)
                sb.Append(tabbing).Append("<skipped />\n");
            else if (string.IsNullOrEmpty(self.failureText))
                sb.Append(tabbing).AppendFormat("<failure message=\"{0}\">{1}</failure>\n", self.message, self.finishState.ToString());
            else
                sb.Append(tabbing).AppendFormat("<failure message=\"{0}\">{1}</failure>\n", self.message, self.failureText);
            tabbing = tabbing.Substring(2);
            sb.Append(tabbing).Append("</testcase>\n");
        }

        private static void AppendTestCaseLine(this TestCaseReport self, ref StringBuilder sb, bool isSingleLine, string tabbing)
        {
            string suffix = isSingleLine ? " /" : "";
            sb.Append(tabbing).AppendFormat("<testcase classname=\"{0}\" name=\"{1}\" time=\"{2}\"{3}>\n", self.classname, self.name, self.time.TotalSeconds.ToString("0.###"), suffix);

        }
        #endregion ===== Extension methods for writing test reports to XML =====
    }
}
