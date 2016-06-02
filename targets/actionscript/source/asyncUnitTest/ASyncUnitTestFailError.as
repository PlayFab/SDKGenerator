package asyncUnitTest
{
    public class ASyncUnitTestFailError extends Error
    {
        public var testEvent:ASyncUnitTestEvent;

        public function ASyncUnitTestFailError(testEvent:ASyncUnitTestEvent)
        {
            super(testEvent.testMessage);
            this.testEvent = testEvent;
            name = "ASyncUnitTestFailError";
        }
    }
}
