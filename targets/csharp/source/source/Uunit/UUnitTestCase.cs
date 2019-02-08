/*
 * UUnit system from UnityCommunity
 * Heavily modified
 * 0.4 release by pboechat
 * http://wiki.unity3d.com/index.php?title=UUnit
 * http://creativecommons.org/licenses/by-sa/3.0/
*/

using PlayFab.Internal;
using System;
using System.Threading.Tasks;

namespace PlayFab.UUnit
{
    public class UUnitTestCase
    {
        /// <summary>
        /// During testing, this is the first function that will be called for each UUnitTestCase.
        /// This is run exactly once for this type.
        /// It is not considered part of any test. A failure or exception in this method will halt the test framework.
        /// </summary>
        public virtual void ClassSetUp()
        {
        }

        /// <summary>
        /// During testing, this will be called once before every test function with the [UUnitTest] attribute
        /// This is run once for each test.
        /// This is considered part of the active test. A failure or exception in this method will be considered a failure for the active test.
        /// </summary>
        public virtual void SetUp(UUnitTestContext testContext)
        {
        }

        /// <summary>
        /// During testing, this will be called every tick that a test is asynchronous.
        /// This is run every unity tick until testContext.EndTest() is called, or until the test times out.
        /// This is considered part of the active test. A failure or exception in this method will be considered a failure for the active test.
        /// </summary>
        public virtual void Tick(UUnitTestContext testContext)
        {
            testContext.Fail(GetType().Name + "." + testContext.Name + ": Async TestCase does not implement Tick().  To fix this error, implement \"" + GetType().Name + ".Tick()\" in your async test, or call testContext.EndTest() in your syncronous test.");
        }

        /// <summary>
        /// During testing, this will be called once after every test function with the [UUnitTest] attribute.
        /// This is run once for each test.
        /// This is considered part of the active test. A failure or exception in this method will be considered a failure for the active test.
        /// </summary>
        public virtual void TearDown(UUnitTestContext testContext)
        {
        }

        /// <summary>
        /// During testing, this is the last function that will be called for each UUnitTestCase.
        /// This is run exactly once for this type.
        /// It is not considered part of any test. A failure or exception in this method will halt the test framework.
        /// </summary>
        public virtual void ClassTearDown()
        {
        }

        protected void ContinueWithContext<T>(Task<PlayFabResult<T>> srcTask, UUnitTestContext testContext, Action<PlayFabResult<T>, UUnitTestContext, string> continueAction, bool expectSuccess, string failMessage, bool endTest) where T : PlayFabResultCommon
        {
            srcTask.ContinueWith(task =>
            {
                var failed = true;
                try
                {
                    if (expectSuccess)
                    {
                        testContext.NotNull(task.Result, failMessage);
                        testContext.IsNull(task.Result.Error, PlayFabUtil.GenerateErrorReport(task.Result.Error));
                        testContext.NotNull(task.Result.Result, failMessage);
                    }
                    if (continueAction != null)
                        continueAction.Invoke(task.Result, testContext, failMessage);
                    failed = false;
                }
                catch (UUnitSkipException uu)
                {
                    // Silence the assert and ensure the test is marked as complete - The exception is just to halt the test process
                    testContext.EndTest(UUnitFinishState.SKIPPED, uu.Message);
                }
                catch (UUnitException uu)
                {
                    // Silence the assert and ensure the test is marked as complete - The exception is just to halt the test process
                    testContext.EndTest(UUnitFinishState.FAILED, uu.Message + "\n" + uu.StackTrace);
                }
                catch (Exception e)
                {
                    // Report this exception as an unhandled failure in the test
                    testContext.EndTest(UUnitFinishState.FAILED, e.ToString());
                }
                if (!failed && endTest)
                    testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            );
        }

        protected Task<PlayFabResult<T>> ThrowIfApiError<T>(Task<PlayFabResult<T>> original) where T : PlayFabResultCommon
        {
            return original.ContinueWith(_ =>
            {
                if (_.IsFaulted) throw _.Exception;
                if (_.Result.Error != null) throw new Exception(_.Result.Error.GenerateErrorReport());
                return _.Result;
            });
        }
    }
}
