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

        public void Run(UUnitTestResult testResult)
        {
            UUnitTestResult.TestState testState = UUnitTestResult.TestState.FAILED;
            string message = null;
            eachTestStopwatch.Reset();
            setUpStopwatch.Reset();
            tearDownStopwatch.Reset();

            try
            {
                testResult.TestStarted();

                setUpStopwatch.Start();
                SetUp();
                setUpStopwatch.Stop();

                Type type = this.GetType();
                MethodInfo method = type.GetRuntimeMethod(testMethodName, EMPTY_PARAMETER_TYPES); // Test methods must contain no parameters
                UUnitAssert.NotNull(method, "Could not execute: " + testMethodName + ", it's probably not public."); // Limited access to loaded assemblies
                eachTestStopwatch.Start();
                ((UUnitTestDelegate)method.CreateDelegate(typeof(UUnitTestDelegate), this))(); // This creates a delegate of the test function, and calls it
                testState = UUnitTestResult.TestState.PASSED;
            }
            catch (UUnitAssertException e)
            {
                message = e.ToString();
                testState = UUnitTestResult.TestState.FAILED;
            }
            catch (UUnitSkipException)
            {
                // message remains null
                testState = UUnitTestResult.TestState.SKIPPED;
            }
            catch (TargetInvocationException e)
            {
                message = e.InnerException.ToString();
                testState = UUnitTestResult.TestState.FAILED;
            }
            catch (Exception e)
            {
                message = e.ToString();
                testState = UUnitTestResult.TestState.FAILED;
            }
            finally
            {
                eachTestStopwatch.Stop();

                if (testState != UUnitTestResult.TestState.SKIPPED)
                {
                    try
                    {
                        tearDownStopwatch.Start();
                        TearDown();
                        tearDownStopwatch.Stop();
                    }
                    catch (Exception e)
                    {
                        message = e.ToString();
                        testState = UUnitTestResult.TestState.FAILED;
                    }
                }
            }

            testResult.TestComplete(testMethodName, testState, eachTestStopwatch.ElapsedMilliseconds, message);
        }

        protected virtual void SetUp()
        {
        }

        protected virtual void TearDown()
        {
        }
    }
}
