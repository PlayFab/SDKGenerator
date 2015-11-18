package asyncUnitTest
{
	import flash.filesystem.*;

    public class ASyncUnitTestFileReporter implements ASyncUnitTestReporter
	{
		private var outputStream:FileStream = new FileStream();

		public function ASyncUnitTestFileReporter(testOutputFileName:String)
		{
			var outputFile:File = new File(testOutputFileName);
			outputStream.open(outputFile, FileMode.WRITE);
			outputStream.writeUTFBytes("Unit Test Output for ActionScript SDK:\n\n");
		}

		public function ReportTestResult(testDuration:Number, testName:String, testResult:int, testMessage:String) : void
		{
			var line:String = '';
			line += testDuration;
			while (line.length < 12)
				line = " " + line;
			line += " - " + testName;
			switch (testResult)
			{
				case ASyncUnitTestEvent.RESULT_SKIPPED: line += " - SKIPPED"; break;
				case ASyncUnitTestEvent.RESULT_ERROR: line += " - ERROR"; break;
				case ASyncUnitTestEvent.RESULT_FAILED: line += " - FAILED"; break;
				case ASyncUnitTestEvent.RESULT_TIMED_OUT: line += " - TIMED OUT"; break;
				case ASyncUnitTestEvent.RESULT_PASSED: line += " - PASSED"; break;
			}
			if (testMessage)
				line += " - " + testMessage;
			line += "\n";
			outputStream.writeUTFBytes(line);
		}

		public function ReportSuiteResult(suiteName:String, suiteSetUpDuration:Number, suiteTearDownDuration:Number, cumulativeSetUpTime:Number, cumulativeTearDownTime:Number,
			testsRun:int, testsPassed:int, testsFailed:int, testsErrored:int, testsTimedOut:int, testsSkipped:int) : void
		{
			ReportTestResult(suiteSetUpDuration, suiteName + ".SuiteSetUp", ASyncUnitTestEvent.RESULT_INVALID, "")
			ReportTestResult(cumulativeSetUpTime, suiteName + ".CumulativeSetUpTime", ASyncUnitTestEvent.RESULT_INVALID, "")
			ReportTestResult(cumulativeTearDownTime, suiteName + ".CumulativeTearDownTime", ASyncUnitTestEvent.RESULT_INVALID, "")
			ReportTestResult(suiteTearDownDuration, suiteName + ".SuiteTearDown", ASyncUnitTestEvent.RESULT_INVALID, "")

			var line:String = '';
			line += "Tests Run: " + testsRun + ", ";
			line += "Tests Passed: " + testsPassed + ", ";
			line += "Tests Failed: " + testsFailed + ", ";
			line += "Tests Errored: " + testsErrored + ", ";
			line += "Test TimeOuts: " + testsTimedOut + ", ";
			line += "Tests Skipped: " + testsSkipped + "\n";
			outputStream.writeUTFBytes(line);

			outputStream.close();
		}

		public function Debug(... args) : void
		{
			var line:String = "";
			for (var i:int = 0; i < args.length; i++)
			{
				if (i != 0)
					line += ", ";
				line += args[i];
			}
			line += "\n";
			outputStream.writeUTFBytes(line);
		}
	}
}
