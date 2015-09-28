package asyncUnitTest
{
	import flash.display.Sprite;
    import flash.errors.*;
    import flash.events.*;
    import flash.utils.getQualifiedClassName;
    import flash.utils.getTimer;
	import flash.utils.Timer;

	public class ASyncUnitTestSuite extends Sprite
	{
		protected var reporter:ASyncUnitTestReporter;
		private var activeTest:TestCall; // The function activating that is currently running
		private var testCalls:Array = new Array(); // A list of all the pending test-function delegates

		private var tickTimer:Timer = new Timer(0,1); // The timer that enforces that tests keep responding in a reasonable timeframe
		private var testTimer:Timer = new Timer(0,1); // The timer that enforces the max total test timeout
		private var suiteTimer:Timer = new Timer(0,1); // The timer that enforces the max suite timeout

		private var activeState:int;
		private var activeTestStartTime:Number;
		private var activeTestEndTime:Number;

		private var suiteSetUpStartTime:Number;
		private var suiteSetUpEndTime:Number;
		private var suiteTearDownStartTime:Number;
		private var suiteTearDownEndTime:Number;
		private var cumulativeSetUpTime:Number;
		private var eachSetUpStartTime:Number;
		private var eachSetUpEndTime:Number;
		private var cumulativeTearDownTime:Number;
		private var eachTearDownStartTime:Number;
		private var eachTearDownEndTime:Number;

		private var testsRun:int;
		private var testsPassed:int;
		private var testsFailed:int;
		private var testsErrored:int;
		private var testsTimedOut:int;
		private var testsSkipped:int;

		public function ASyncUnitTestSuite(reporter:ASyncUnitTestReporter)
		{
			this.reporter = reporter;

			addEventListener(ASyncUnitTestEvent.SUITE_SETUP_COMPLETE, SuiteSetUpCompleteHandler);
			addEventListener(ASyncUnitTestEvent.TEST_SETUP_COMPLETE, SetUpCompleteHandler);
			addEventListener(ASyncUnitTestEvent.TICK_TEST, TickTestHandler);
			addEventListener(ASyncUnitTestEvent.FINISH_TEST, FinishTestHandler);
			addEventListener(ASyncUnitTestEvent.TEST_TEARDOWN_COMPLETE, TearDownCompleteHandler);
			addEventListener(ASyncUnitTestEvent.SUITE_TEARDOWN_COMPLETE, SuiteTearDownCompleteHandler);

			tickTimer.addEventListener(TimerEvent.TIMER_COMPLETE, OnTestTimeout);
			testTimer.addEventListener(TimerEvent.TIMER_COMPLETE, OnTestTimeout);
			suiteTimer.addEventListener(TimerEvent.TIMER_COMPLETE, OnTestTimeout);

			activeState = ASyncUnitTestEvent.STATE_PENDING;

			suiteSetUpStartTime = suiteSetUpEndTime = suiteTearDownStartTime = suiteTearDownEndTime = cumulativeSetUpTime = cumulativeTearDownTime = 0;

			testsRun = testsSkipped = testsFailed = testsTimedOut = testsPassed = 0;
		}

		// Adds a test to an ordered list of tests to be executed
		public function AddTest(testName:String, testFunc:Function) : void
		{
			testCalls.unshift(new TestCall(testName, testFunc)); // Queue Functionality
		}

		// Call this function from outside the system to activate this TestCase
		// Because this entire system is async, we only kick off the tests, and expect event callbacks in the future.
		public function KickOffTests(tickTimeout:Number = 2, testTimeout:Number = 15, suiteTimeout:Number = 180) : void
		{
			tickTimer.delay = tickTimeout * 1000;
			tickTimer.repeatCount = 1;
			testTimer.delay = testTimeout * 1000;
			testTimer.repeatCount = 1;
			suiteTimer.delay = testTimeout * 1000;
			suiteTimer.repeatCount = 1;

			suiteTimer.start();
			suiteSetUpStartTime = getTimer();
			activeState = ASyncUnitTestEvent.STATE_SUITE_SETUP;
			SuiteSetUp();
		}

		// SuiteSetUp is called once, immediately after KickOffTests
		// For synchronous, override and super-call within your function
		// For asynchronous, override, but do NOT super-call until the end of your sequence
		//   (the last event handler which indicates your sequence is complete)
		protected function SuiteSetUp() : void
		{
			dispatchEvent(new ASyncUnitTestEvent(ASyncUnitTestEvent.SUITE_SETUP_COMPLETE));
		}

		protected function SuiteSetUpCompleteHandler(event:ASyncUnitTestEvent = null) : void
		{
			if (activeState == ASyncUnitTestEvent.STATE_TIMED_OUT)
				return;

			TickTestHandler();
			suiteSetUpEndTime = getTimer();
			StartNextTest();
		}

		private function StartNextTest() : void
		{
			testTimer.reset();
			testTimer.start();

			if (testCalls.length > 0) // Continue on to the next test
			{
				activeTest = testCalls.pop();
				eachSetUpStartTime = getTimer();
				activeState = ASyncUnitTestEvent.STATE_TEST_SETUP;
				SetUp();
			}
			else // Trigger the final cleanup
			{
				suiteTearDownStartTime = getTimer();
				SuiteTearDown();
			}
		}

		// SetUp is called before every test function
		//   SetUp is NOT called for any tests skipped due to a previous test-timeout
		// For synchronous, override and super-call within your function
		// For asynchronous, override, but do NOT super-call until the end of your sequence
		//   (the last event handler which indicates your sequence is complete)
		protected function SetUp() : void
		{
			dispatchEvent(new ASyncUnitTestEvent(ASyncUnitTestEvent.TEST_SETUP_COMPLETE));
		}

		protected function SetUpCompleteHandler(event:ASyncUnitTestEvent = null) : void
		{
			if (activeState == ASyncUnitTestEvent.STATE_TIMED_OUT)
				return;

			TickTestHandler();
			eachSetUpEndTime = getTimer();
			cumulativeSetUpTime += eachSetUpEndTime - eachSetUpStartTime

			activeTestStartTime = eachSetUpEndTime;
			activeState = ASyncUnitTestEvent.STATE_TEST_RUNNING;
			testsRun += 1

			var wrappedCall:Function = Wrap(activeTest.testFunc, activeTest.testName);
			wrappedCall.call();
		}

		// A test has notified that it's made progress, reset the tick-timeout
		// This can be called directly, or posted as an event
		// Call this whenever your test makes progress, such as receiving an async-event
		protected function TickTestHandler(event:ASyncUnitTestEvent = null) : void
		{
			tickTimer.reset();
			tickTimer.start();
		}

		// Report that a test has completed.  This is the only place where event.testResult is used
		// This can be called directly, or posted as an event
		protected function FinishTestHandler(event:ASyncUnitTestEvent) : void
		{
			if (activeState == ASyncUnitTestEvent.STATE_TIMED_OUT)
				return;

			TickTestHandler();
			activeTestEndTime = getTimer();
			reporter.ReportTestResult(activeTestEndTime - activeTestStartTime, activeTest.testName, event.testResult, event.testMessage);
			activeTest = null;

			switch (event.testResult)
			{
				case ASyncUnitTestEvent.RESULT_PASSED: testsPassed += 1; break;
				case ASyncUnitTestEvent.RESULT_FAILED: testsFailed += 1; break;
				case ASyncUnitTestEvent.RESULT_ERROR: testsErrored += 1; break;
				case ASyncUnitTestEvent.RESULT_TIMED_OUT: testsTimedOut += 1; break;
				case ASyncUnitTestEvent.RESULT_SKIPPED: testsSkipped += 1; break;
			}

			activeState = ASyncUnitTestEvent.STATE_TEST_TEARDOWN;
			eachTearDownStartTime = activeTestEndTime;
			if (event.testResult != ASyncUnitTestEvent.RESULT_SKIPPED)
				TearDown();
		}

		// TearDown is called after every test function dispatches a FINISH_TEST event, or after the current test times out
		//   TearDown is NOT called for any tests skipped due to a previous test-timeout
		// For synchronous, override and super-call within your function
		// For asynchronous, override, but do NOT super-call until the end of your sequence
		//   (the last event handler which indicates your sequence is complete)
		protected function TearDown() : void
		{
			dispatchEvent(new ASyncUnitTestEvent(ASyncUnitTestEvent.TEST_TEARDOWN_COMPLETE));
		}

		protected function TearDownCompleteHandler(event:ASyncUnitTestEvent = null) : void
		{
			if (activeState == ASyncUnitTestEvent.STATE_TIMED_OUT)
				return;

			eachTearDownEndTime = getTimer();
			cumulativeTearDownTime += eachTearDownStartTime - eachTearDownEndTime
			StartNextTest();
		}

		// SuiteTearDown is called once
		// For synchronous, override and super-call within your function
		// For asynchronous, override, but do NOT super-call until the end of your sequence
		//   (the last event handler which indicates your sequence is complete)
		protected function SuiteTearDown() : void
		{
			dispatchEvent(new ASyncUnitTestEvent(ASyncUnitTestEvent.SUITE_TEARDOWN_COMPLETE));
		}

		protected function SuiteTearDownCompleteHandler(event:ASyncUnitTestEvent = null) : void
		{
			if (activeState == ASyncUnitTestEvent.STATE_TIMED_OUT)
				return;

			suiteTearDownEndTime = getTimer();
			Cleanup();

			ReportSuiteResult(suiteSetUpEndTime - suiteSetUpStartTime, suiteTearDownEndTime - suiteTearDownStartTime, cumulativeSetUpTime, cumulativeTearDownTime,
				testsRun, testsPassed, testsFailed, testsErrored, testsTimedOut, testsSkipped);
		}

		private function Cleanup() : void
		{
			removeEventListener(ASyncUnitTestEvent.SUITE_SETUP_COMPLETE, SuiteSetUpCompleteHandler);
			removeEventListener(ASyncUnitTestEvent.TEST_SETUP_COMPLETE, SetUpCompleteHandler);
			removeEventListener(ASyncUnitTestEvent.TICK_TEST, TickTestHandler);
			removeEventListener(ASyncUnitTestEvent.FINISH_TEST, FinishTestHandler);
			removeEventListener(ASyncUnitTestEvent.TEST_TEARDOWN_COMPLETE, TearDownCompleteHandler);
			removeEventListener(ASyncUnitTestEvent.SUITE_TEARDOWN_COMPLETE, SuiteTearDownCompleteHandler);

			tickTimer.reset();
			testTimer.reset();
			suiteTimer.reset();
			tickTimer.removeEventListener(TimerEvent.TIMER_COMPLETE, OnTestTimeout);
			testTimer.removeEventListener(TimerEvent.TIMER_COMPLETE, OnTestTimeout);
			suiteTimer.removeEventListener(TimerEvent.TIMER_COMPLETE, OnTestTimeout);
		}

		// All callbacks passed into sequential steps should use Wrap, so that errors in those functions will be caught as error-failures here
		protected function Wrap(func:Function, description:String) : Function
		{
			function Wrapper(... args) : void
			{
				TickTestHandler();
				try
				{
					func.apply(null, args);
				}
				catch(error:ASyncUnitTestFailError)
				{
					error.testEvent.testMessage = "\n" + error.getStackTrace();
					FinishTestHandler(error.testEvent);
				}
				catch(error:Error)
				{
					var testMessage:String = description + "\n" + error.getStackTrace();
					FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_ERROR, testMessage));
				}
				TickTestHandler();
			}
			return Wrapper;
		}

		// If there is a timeout, skip all remaining tests, including the active one
		private function OnTestTimeout(event:Event) : void
		{
			if (activeTest != null) // This will kick off a TearDown
				FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_TIMED_OUT, "Timeout during test"));

			while (testCalls.length > 0) // Skip all tests
			{
				var eachSkippedTest:TestCall = testCalls.pop();
				reporter.ReportTestResult(activeTestEndTime - activeTestStartTime, eachSkippedTest.testName, ASyncUnitTestEvent.RESULT_SKIPPED, "Timeout during previous test");
			}

			activeState = ASyncUnitTestEvent.STATE_TIMED_OUT;
			ReportSuiteResult(suiteSetUpEndTime - suiteSetUpStartTime, -1, cumulativeSetUpTime, cumulativeTearDownTime,
				testsRun, testsPassed, testsFailed, testsErrored, testsTimedOut, testsSkipped);
		}

		protected function ReportSuiteResult(suiteSetUpDuration:Number, suiteTearDownDuration:Number, cumulativeSetUpTime:Number, cumulativeTearDownTime:Number,
			testsRun:int, testsPassed:int, testsFailed:int, testsErrored:int, testsTimedOut:int, testsSkipped:int) : void
		{
			reporter.ReportSuiteResult(getQualifiedClassName(this), suiteSetUpDuration, suiteTearDownDuration, cumulativeSetUpTime, cumulativeTearDownTime,
				testsRun, testsPassed, testsFailed, testsErrored, testsTimedOut, testsSkipped);

			var event:ASyncUnitTestEvent = new ASyncUnitTestEvent(ASyncUnitTestEvent.SUITE_TEARDOWN_COMPLETE);
			event.SetResultReport(suiteSetUpDuration, suiteTearDownDuration, cumulativeSetUpTime, cumulativeTearDownTime,
				testsRun, testsPassed, testsFailed, testsErrored, testsTimedOut, testsSkipped);

			dispatchEvent(event);
		}
	}
}

class TestCall
{
	public var testName:String;
	public var testFunc:Function;
	public function TestCall(testName:String, testFunc:Function)
	{
		this.testName = testName;
		this.testFunc = testFunc;
	}
	
	public function toString() : String
	{
		return testName;
	}
}
