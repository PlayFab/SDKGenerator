/*
 * UUnit system from UnityCommunity
 * Heavily modified
 * 0.4 release by pboechat
 * http://wiki.unity3d.com/index.php?title=UUnit
 * http://creativecommons.org/licenses/by-sa/3.0/
*/

using System;
using System.Diagnostics;
using System.Reflection;

namespace PlayFab.UUnit
{
    public class UUnitTestCase
    {
        private delegate void UUnitTestDelegate();
        private static Type[] EMPTY_PARAMETER_TYPES = new Type[0];
        private static object[] EMPTY_PARAMETERS = new object[0];

        Stopwatch setUpStopwatch = new Stopwatch();
        Stopwatch tearDownStopwatch = new Stopwatch();
        Stopwatch eachTestStopwatch = new Stopwatch();
        private string testMethodName;

        public void SetTest(string testMethodName)
        {
            this.testMethodName = testMethodName;
        }

        public void Run(UUnitTestResults testResults)
        {
            TestFinishState testFinishState = TestFinishState.FAILED;
            string message = null, stacktrace = null;
            eachTestStopwatch.Reset();
            setUpStopwatch.Reset();
            tearDownStopwatch.Reset();

            try
            {
                testResults.TestStarted();

                setUpStopwatch.Start();
                SetUp();
                setUpStopwatch.Stop();

                Type type = this.GetType();
                MethodInfo method = type.GetRuntimeMethod(testMethodName, EMPTY_PARAMETER_TYPES); // Test methods must contain no parameters
                UUnitAssert.NotNull(method, "Could not execute: " + testMethodName + ", it's probably not public."); // Limited access to loaded assemblies
                eachTestStopwatch.Start();
                ((UUnitTestDelegate)method.CreateDelegate(typeof(UUnitTestDelegate), this))(); // This creates a delegate of the test function, and calls it
                testFinishState = TestFinishState.PASSED;
            }
            catch (UUnitAssertException e)
            {
                message = e.message;
                stacktrace = e.StackTrace;
                testFinishState = TestFinishState.FAILED;
            }
            catch (UUnitSkipException)
            {
                // message remains null
                testFinishState = TestFinishState.SKIPPED;
            }
            catch (TargetInvocationException e)
            {
                message = e.InnerException.Message;
                stacktrace = e.InnerException.StackTrace;
                testFinishState = TestFinishState.FAILED;
            }
            catch (Exception e)
            {
                message = e.Message;
                stacktrace = e.StackTrace;
                testFinishState = TestFinishState.FAILED;
            }
            finally
            {
                eachTestStopwatch.Stop();

                if (testFinishState != TestFinishState.SKIPPED)
                {
                    try
                    {
                        tearDownStopwatch.Start();
                        TearDown();
                        tearDownStopwatch.Stop();
                    }
                    catch (Exception e)
                    {
                        message = e.Message;
                        stacktrace = e.StackTrace;
                        testFinishState = TestFinishState.FAILED;
                    }
                }
            }

            testResults.TestComplete(testMethodName, testFinishState, eachTestStopwatch.ElapsedMilliseconds, message, stacktrace);
        }

        protected virtual void SetUp()
        {
        }

        protected virtual void TearDown()
        {
        }
    }
}
