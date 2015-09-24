package asyncUnitTest
{
	import flash.display.Sprite;
    import flash.errors.*;
    import flash.events.*;
	import flash.utils.Timer;
    import flash.utils.getTimer;

	public class ASyncUnitTestEvent extends Event
	{
		public static const SUITE_SETUP_COMPLETE:String = "SUITE_SETUP_COMPLETE";
		public static const TEST_SETUP_COMPLETE:String = "TEST_SETUP_COMPLETE";
		public static const TICK_TEST:String = "TICK_TEST";
		public static const FINISH_TEST:String = "FINISH_TEST";
		public static const TEST_TEARDOWN_COMPLETE:String = "TEST_TEARDOWN_COMPLETE";
		public static const SUITE_TEARDOWN_COMPLETE:String = "SUITE_TEARDOWN_COMPLETE";

		public static const STATE_PENDING:int = 0;
		public static const STATE_SUITE_SETUP:int = 1;
		public static const STATE_TEST_SETUP:int = 2;
		public static const STATE_TEST_RUNNING:int = 3;
		public static const STATE_TEST_TEARDOWN:int = 4;
		public static const STATE_SUITE_TEARDOWN:int = 5;
		public static const STATE_FINISHED:int = 6;
		public static const STATE_TIMED_OUT:int = 7;

		public static const RESULT_INVALID:int = 0;
		public static const RESULT_SKIPPED:int = 1;
		public static const RESULT_ERROR:int = 2;
		public static const RESULT_FAILED:int = 3;
		public static const RESULT_TIMED_OUT:int = 4; // This must by necessity cause all following tests to be RESULT_SKIPPED
		public static const RESULT_PASSED:int = 5;

		public var testResult:int;
		public var testMessage:String;

		// Result Report Data
		public var suiteSetUpDuration:Number;
		public var suiteTearDownDuration:Number;
		public var cumulativeSetUpTime:Number;
		public var cumulativeTearDownTime:Number;
		public var testsRun:int;
		public var testsPassed:int;
		public var testsFailed:int;
		public var testsErrored:int;
		public var testsTimedOut:int;
		public var testsSkipped:int;

		public function ASyncUnitTestEvent(type:String, testResult:int=RESULT_PASSED, testMessage:String=null, bubbles:Boolean=false, cancelable:Boolean=false) : void
		{
			super(type, bubbles, cancelable);
			this.testResult = testResult;
			this.testMessage = testMessage;
		}

		public function SetResultReport(suiteSetUpDuration:Number, suiteTearDownDuration:Number, cumulativeSetUpTime:Number, cumulativeTearDownTime:Number,
			testsRun:int, testsPassed:int, testsFailed:int, testsErrored:int, testsTimedOut:int, testsSkipped:int) : void
		{
			this.suiteSetUpDuration = suiteSetUpDuration;
			this.suiteTearDownDuration = suiteTearDownDuration;
			this.cumulativeSetUpTime = cumulativeSetUpTime;
			this.cumulativeTearDownTime = cumulativeTearDownTime;
			this.testsRun = testsRun;
			this.testsPassed = testsPassed;
			this.testsFailed = testsFailed;
			this.testsErrored = testsErrored;
			this.testsTimedOut = testsTimedOut;
			this.testsSkipped = testsSkipped;
		}
	}
}
