package asyncUnitTest
{
    import flash.utils.getQualifiedClassName;
    import flash.events.EventDispatcher;

    // Assert is a little less accurate given how the ASync test system works, but it follows the same naming scheme
	// If the condition of the test fails, then the test is marked as failed with the given message (when provided).
	// The failure is ALSO asynchronous like everything else, 

    public class ASyncAssert extends EventDispatcher
	{
		public static var activeTestSuite:ASyncUnitTestSuite;
		private static var sharedEvent:ASyncUnitTestEvent = new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_FAILED)

		public static function AssertTrue(condition:Boolean, message:String = null) : void
		{
			if (condition) return;

			if (!message)
				message = "Expected: true, Got: false";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
		}

		public static function AssertFalse(condition:Boolean, message:String = null) : void
		{
			if (!condition) return;

			if (!message)
				message = "Expected: false, Got: true";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
		}

        public static function Fail(message:String = null) : void
		{
			if (!message)
				message = "";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }

        public static function AssertThrows(errorType:Class, block:Function, message:String = null) : void
		{
            try
			{
                block.call();
				if (!message)
					message = "Failed to throw expected exception";
				sharedEvent.testMessage = message;
				throw new ASyncUnitTestFailError(sharedEvent);
            }
            catch(e:Error)
			{
                if(!(e is errorType))
				{
					if (!message)
						message = "Failed to throw expected exception.  Expected: " + getQualifiedClassName(errorType) + ", Got: " + getQualifiedClassName(e);
					sharedEvent.testMessage = message;
					throw new ASyncUnitTestFailError(sharedEvent);
                }
            }
        }

        public static function AssertNotNull(object:Object, message:String = null) : void
		{
			if (object != null) return;

			if (!message)
				message = "Expected: !null, Got: null";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }

        public static function AssertNull(object:Object, message:String = null) : void
		{
			if (object == null) return;

			if (!message)
				message = "Expected: null, Got: !null";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }

        public static function AssertSame(expected:Object, actual:Object, message:String = null) : void
		{
			if (expected === actual) return;

			if (!message)
				message = "Expected: two ref's to same object, Got: different";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }

        public static function AssertNotSame(expected:Object, actual:Object, message:String = null) : void
		{
			if (!(expected === actual)) return;

			if (!message)
				message = "Expected: multiple object refs, Got: same";
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }

        public static function AssertEquals(expected:Object, actual:Object, message:String = null) : void
		{
			if (expected == null && actual == null) return;
			if (expected != null && actual != null)
			{
				try {
					if(expected.equals(actual)) return;
				}
				catch(e:Error) {
					if(expected == actual) return;
				}
			}

			if (!message)
				message = "Objects expected to be equal: " + expected + " != " + actual;
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }

        public static function AssertEqualsFloat(expected:Number, actual:Number, tolerance:Number, message:String = null) : void
		{
            if (!isNaN(expected) && isNaN(actual))
			{
				if (isNaN(tolerance)) tolerance = 0;
				if(Math.abs(expected - actual) <= tolerance) return;
			}

			if (!message)
				message = "Objects expected to be equal: " + expected + " != " + actual;
			sharedEvent.testMessage = message;
			throw new ASyncUnitTestFailError(sharedEvent);
        }
    }
}
