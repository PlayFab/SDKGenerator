package
{
    import flash.desktop.NativeApplication;
    import flash.display.Sprite;
    import flash.events.*;
    import flash.filesystem.*;
    import flash.text.*;

    import asyncUnitTest.ASyncUnitTestEvent;
    import asyncUnitTest.ASyncUnitTestFileReporter;
    import asyncUnitTest.ASyncUnitTestCloudScriptReporter;

    import com.playfab.PlayFabVersion;

    public class PfApiTest extends Sprite
    {
        private var textField:TextField = new TextField();
        private var testSuite:PlayFabApiTests;

        public function PfApiTest()
        {
            NativeApplication.nativeApplication.addEventListener(InvokeEvent.INVOKE, onInvoke);

            textField.x=0;
            textField.y=0;
            textField.width=2000;
            textField.height=2000;
            stage.addChild(textField);
            textField.text = "Loading program";
        }

        // Detect when the program has started and get command line inputs
        private function onInvoke(e:InvokeEvent):void
        {
            var outputFile:File = File.applicationDirectory;
            outputFile = outputFile.resolvePath("testOutput.txt"); // If you use this path directly, it refuses to write in the applicationDirectory path, but...

            var titleDataFileName:String = e.arguments[0];
            textField.text = "Loading the Title Data file: " + titleDataFileName;
            textField.text += "Saving test results to: " + outputFile.nativePath;

            var reporters:Array = new Array();
            reporters.unshift(new ASyncUnitTestFileReporter(outputFile.nativePath, PlayFabVersion.BuildIdentifier));
            reporters.unshift(new ASyncUnitTestCloudScriptReporter());

            testSuite = new PlayFabApiTests(titleDataFileName, reporters);
            testSuite.addEventListener(ASyncUnitTestEvent.SUITE_TEARDOWN_COMPLETE, OnTestsComplete);
        }

        // Title Data loaded, do tests
        private function OnTestsComplete(event:ASyncUnitTestEvent) : void
        {
            textField.text = "Tests finished";
            testSuite.removeEventListener(ASyncUnitTestEvent.SUITE_TEARDOWN_COMPLETE, OnTestsComplete);

            var exitCode:int = 0;
            if (event.testsErrored > 0 || event.testsSkipped > 0 || event.testsFailed > 0 || event.testsTimedOut > 0)
                exitCode = 1000 + event.testsErrored + event.testsSkipped + event.testsFailed + event.testsTimedOut;
            NativeApplication.nativeApplication.exit(exitCode);
        }
    }
}
