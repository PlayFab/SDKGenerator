/*
 * UUnit system from UnityCommunity
 * Heavily modified
 * 0.4 release by pboechat
 * http://wiki.unity3d.com/index.php?title=UUnit
 * http://creativecommons.org/licenses/by-sa/3.0/
*/

using System;
using System.Collections.Generic;
using System.Reflection;

namespace PlayFab.UUnit
{
    [AttributeUsage(AttributeTargets.Method)]
    public class UUnitTestAttribute : Attribute
    {
    }

    public class UUnitTestSuite
    {
        private List<UUnitTestCase> tests = new List<UUnitTestCase>();
        private int lastTestIndex = -1;
        private UUnitTestResult testResult = new UUnitTestResult();

        public void Add(UUnitTestCase testCase)
        {
            tests.Add(testCase);
        }

        public void RunAllTests()
        {
            bool eachResult = false;
            while (eachResult == false)
                eachResult = RunOneTest();
        }

        /// <summary>
        /// Run a single test, and return whether the test suite is finished
        /// </summary>
        /// <returns>True when all tests are finished</returns>
        public bool RunOneTest()
        {
            // Abort if we've already finished testing
            bool doneTesting = lastTestIndex >= tests.Count;
            if (doneTesting) return true;

            lastTestIndex++;
            doneTesting = lastTestIndex >= tests.Count;
            if (!doneTesting)
            {
                tests[lastTestIndex].Run(testResult);
            }
            return doneTesting;
        }

        public UUnitTestResult GetResults()
        {
            bool doneTesting = lastTestIndex >= tests.Count;
            return doneTesting ? testResult : null; // Only return the results when finished
        }

        public void FindAndAddAllTestCases(Assembly assembly, Type parent)
        {
            var x = typeof(UUnitTestSuite).GetTypeInfo().Assembly;
            // TODO: Call this with: typeof(UUnitTestSuite).GetTypeInfo().Assembly - Nothing calls this yet

            // var assemblies = AppDomain.CurrentDomain.GetAssemblies();
            // For windows Phone (WinRT), you can't get all available assemblies, you can only get them if they're "known"
            // If needed, call this function multiple times with multiple assemblies (Don't repeat the same assembly!)
            foreach (var t in assembly.DefinedTypes)
            {
                if (!t.IsAbstract && t.IsSubclassOf(parent))
                    AddAll(t);
            }
        }

        private void AddAll(TypeInfo testCaseType)
        {
            foreach (MethodInfo m in testCaseType.DeclaredMethods)
            {
                var attributes = m.GetCustomAttributes(typeof(UUnitTestAttribute), false);
                foreach (var attr in attributes)
                {
                    var constructors = testCaseType.DeclaredConstructors;
                    foreach (var constructor in constructors)
                    {
                        UUnitTestCase newTestCase = (UUnitTestCase)constructor.Invoke(null);
                        newTestCase.SetTest(m.Name);
                        Add(newTestCase);
                        break; // We only want 1 constructor, if relevant
                    }
                    break; // We only want 1 attribute, if relevant
                }
            }
        }

        /// <summary>
        /// Return that tests were run, and all of them reported success
        /// </summary>
        public bool AllTestsPassed()
        {
            return testResult.AllTestsPassed();
        }
    }
}
