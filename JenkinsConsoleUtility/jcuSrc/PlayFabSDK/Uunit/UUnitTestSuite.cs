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
        private readonly List<UUnitTestCase> _tests = new List<UUnitTestCase>();
        private int _lastTestIndex = -1;
        private readonly UUnitTestResults _testResults;

        public UUnitTestSuite(string classname)
        {
            _testResults = new UUnitTestResults(classname);
        }

        public void Add(UUnitTestCase testCase)
        {
            _tests.Add(testCase);
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
        /// <returns>True when all _tests are finished</returns>
        public bool RunOneTest()
        {
            // Abort if we've already finished testing
            bool doneTesting = _lastTestIndex >= _tests.Count;
            if (doneTesting) return true;

            _lastTestIndex++;
            doneTesting = _lastTestIndex >= _tests.Count;
            if (!doneTesting)
            {
                _tests[_lastTestIndex].Run(_testResults);
            }
            return doneTesting;
        }

        public UUnitTestResults GetResults()
        {
            bool doneTesting = _lastTestIndex >= _tests.Count;
            return doneTesting ? _testResults : null; // Only return the results when finished
        }

        /// <summary>
        /// If using WinStore/WinPhone, you should call via:
        ///   suite.FindAndAddAllTestCases(typeof(UUnitTestSuite).GetTypeInfo().Assembly, typeof(UUnitTestCase))
        /// If you have full reflection (IE everything else), call via:
        ///   foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
        ///     suite.FindAndAddAllTestCases(assembly, typeof(UUnitTestCase));
        /// Don't add the same assembly/parent multiple times, or it'll repeat the same test multiple times
        /// </summary>
        /// <param name="assembly"></param>
        /// <param name="parent"></param>
        public void FindAndAddAllTestCases(Assembly assembly, Type parent)
        {
            foreach (var t in assembly.DefinedTypes)
                if (!t.IsAbstract && t.IsSubclassOf(parent))
                    AddAll(t);
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
        /// Return that _tests were run, and all of them reported success
        /// </summary>
        public bool AllTestsPassed()
        {
            return _testResults.AllTestsPassed();
        }
    }
}
