using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
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

        private string tempFileFullPath;

        protected override void SetUp()
        {
            string tempFolderPath = Environment.GetEnvironmentVariable("TEMP"); // Get the Windows 10 user temp folder
            tempFileFullPath = Path.Combine(tempFolderPath, tempFilename);

            var outfile = File.Open(tempFileFullPath, FileMode.Create);
            byte[] buffer = Encoding.UTF8.GetBytes(EXAMPLE_XML);
            outfile.Write(buffer, 0, buffer.Length);
            outfile.Close();
        }

        [UUnitTest]
        public void XmlReadWriteSequence()
        {
            List<JUnitXml.TestSuite> xmlReport = JUnitXml.ParseXmlFile(tempFileFullPath);
            JUnitXml.WriteXmlFile(tempFileFullPath, xmlReport, true);
            List<JUnitXml.TestSuite> xmlReport2 = JUnitXml.ParseXmlFile(tempFileFullPath);
        }
    }
}
