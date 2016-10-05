using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility.Testing
{
    public class XmlTests : UUnitTestCase
    {
        private const string tempFilename = "tempJUnit.xml";
        // Can't really do a multiline string that also contains quotes in a single assignment
        public const string EXAMPLE_XML =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<testsuites>\n" +
            "  <testsuite name=\"JUnitXmlReporter\" errors=\"0\" tests=\"0\" failures=\"0\" time=\"0\" timestamp=\"2013-05-24T10:23:58\" />\n" +
            "  <testsuite name=\"JUnitXmlReporter.constructor\" errors=\"0\" skipped=\"1\" tests=\"3\" failures=\"1\" time=\"0.006\" timestamp=\"2013-05-24T10:23:58\">\n" +
            "    <properties>\n" +
            "      <property name=\"java.vendor\" value=\"Sun Microsystems Inc.\" />\n" +
            "      <property name=\"compiler.debug\" value=\"on\" />\n" +
            "      <property name=\"project.jdk.classpath\" value=\"jdk.classpath.1.6\" />\n" +
            "    </properties>\n" +
            "    <testcase classname=\"JUnitXmlReporter.constructor\" name=\"should default path to an empty string\" time=\"0.006\">\n" +
            "      <failure message=\"test failure\">Assertion failed</failure>\n" +
            "    </testcase>\n" +
            "    <testcase classname=\"JUnitXmlReporter.constructor\" name=\"should default consolidate to true\" time=\"0\">\n" +
            "      <skipped />\n" +
            "    </testcase>\n" +
            "    <testcase classname=\"JUnitXmlReporter.constructor\" name=\"should default useDotNotation to true\" time=\"0\" />\n" +
            "  </testsuite>\n" +
            "</testsuites>\n";

        private string _tempFileFullPath;

        protected override void SetUp()
        {
            var tempFolderPath = Environment.GetEnvironmentVariable("TEMP") ?? ""; // Get the Windows 10 user temp folder
            _tempFileFullPath = Path.Combine(tempFolderPath, tempFilename);

            var outfile = File.Open(_tempFileFullPath, FileMode.Create);
            byte[] buffer = Encoding.UTF8.GetBytes(EXAMPLE_XML);
            outfile.Write(buffer, 0, buffer.Length);
            outfile.Close();
        }

        [UUnitTest]
        public void XmlReadWriteSequence()
        {
            List<TestSuiteReport> xmlReport = JUnitXml.ParseXmlFile(_tempFileFullPath);
            JUnitXml.WriteXmlFile(_tempFileFullPath, xmlReport, true);
            List<TestSuiteReport> xmlReport2 = JUnitXml.ParseXmlFile(_tempFileFullPath);
            UUnitAssert.IntEquals(xmlReport.Count, xmlReport2.Count);
        }

        [UUnitTest]
        public void PassWithMessageXml()
        {
            var readFileName = "../../testPassWithMessage.xml";
            List<TestSuiteReport> inputReport = JUnitXml.ParseXmlFile(readFileName);
            JUnitXml.WriteXmlFile(_tempFileFullPath, inputReport, true);
            List<TestSuiteReport> testReport = JUnitXml.ParseXmlFile(_tempFileFullPath);
            UUnitAssert.IntEquals(1, testReport.Count);
            foreach (var eachReport in testReport)
            {
                UUnitAssert.IntEquals(0, eachReport.failures);
                UUnitAssert.IntEquals(0, eachReport.skipped);
                UUnitAssert.NotNull(eachReport.testResults);
                foreach (var eachTest in eachReport.testResults)
                    UUnitAssert.True(eachTest.IsXmlSingleLine());
            }
        }

        [UUnitTest]
        public void PassWithMessageJson()
        {
            var readFileName = "../../testPassWithMessage.json";
            UUnitAssert.True(File.Exists(readFileName));
            var json = File.ReadAllText(readFileName);
            List<TestSuiteReport> testReport = JsonConvert.DeserializeObject<List<TestSuiteReport>>(json);
            UUnitAssert.IntEquals(1, testReport.Count);
            foreach (var eachReport in testReport)
            {
                UUnitAssert.IntEquals(0, eachReport.failures);
                UUnitAssert.IntEquals(0, eachReport.skipped);
                UUnitAssert.NotNull(eachReport.testResults);
                foreach (var eachTest in eachReport.testResults)
                    UUnitAssert.True(eachTest.IsXmlSingleLine());
            }
        }
    }
}
