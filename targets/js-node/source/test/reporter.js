/*!
 * Custom PlayFab test reporter for Nodeunit
 */

/**
 * Module dependencies
 */

var nodeunit = require("nodeunit"),
    utils = nodeunit.utils,
    fs = require("fs"),
    path = require("path"),
    track = require("nodeunit/lib/track"),
    AssertionError = require("assert").AssertionError;

/**
 * Reporter info string
 */

exports.info = "PlayFab minimal output";

/**
 * Run all tests within each module, reporting the results to the command-line.
 *
 * @param {Array} files
 * @api public
 */

// The test report that will ultimately be relayed back to Cloud Script when the suite finishes
exports.PfTestReport = [{
    name: "",
    tests: 0,
    failures: 0,
    errors: 0,
    skipped: 0,
    time: 0.0,
    timestamp: (new Date()).toISOString(),
    testResults: []
}];

exports.run = function (files, options, callback) {
    if (!options) {
        // load default options
        var content = fs.readFileSync(
            __dirname + "/nodeunit.json", "utf8"
        );
        options = JSON.parse(content);
    }

    var start = new Date().getTime();
    var testStartTimes = {};

    var tracker = track.createTracker(function (tracker) {
        if (tracker.unfinished()) {
            console.log("");
            console.log("FAILURES: Undone tests (or their setups/teardowns): ");
            var names = tracker.names();
            for (var i = 0; i < names.length; i += 1) {
                console.log("- " + names[i]);
            }
            console.log("");
            console.log("To fix this, make sure all tests call test.done()");
            process.reallyExit(tracker.unfinished());
        }
    });

    var opts = {
        testspec: options.testspec,
        testFullSpec: options.testFullSpec,
        moduleStart: function (name) {
            console.log("Running tests from: ", name);
        },
        moduleDone: function (name, assertions) {
            console.log("");
            if (assertions.failures()) {
                assertions.forEach(function (a) {
                    if (a.failed()) {
                        a = utils.betterErrors(a);
                        if (a.error instanceof AssertionError && a.message) {
                            console.log("Assertion in test " + a.testname + ": " + a.message);
                        }
                        console.log(a.error.stack + "\n");
                    }
                });
            }

        },
        testStart: function (name) {
            tracker.put(name);
            exports.PfTestReport[0].tests += 1;
            testStartTimes[name] = new Date().getTime();
        },
        testDone: function (name, assertions) {
            tracker.remove(name);
            var testDuration = new Date().getTime() - testStartTimes[name];
            var testDurationStr = (testDuration).toString(); // Need to know the length of this in string form

            var numFails = assertions.failures();
            var newTestReport;
            if (numFails > 0) {
                var message = "";
                for (idx in assertions) {
                    if (assertions[idx].hasOwnProperty("error") && assertions[idx].error) {
                        if (message.length > 0)
                            message += "\n";
                        message += assertions[idx].error.message;
                    }
                }

                exports.PfTestReport[0].failures += 1;
                newTestReport = {
                    classname: exports.PfTestReport[0].name,
                    name: name[1],
                    finishState: "FAILED",
                    time: testDuration / 1000.0,
                    message: message,
                    failureText: "FAILED"
                }
            } else {
                newTestReport = {
                    classname: exports.PfTestReport[0].name,
                    name: name[1],
                    finishState: "PASSED",
                    time: testDuration / 1000.0,
                }
            }
            exports.PfTestReport[0].testResults.push(newTestReport);

            var testLineOutput = "";
            for (i = testDurationStr.length; i < 10; i++)
                testLineOutput += " ";
            testLineOutput += testDurationStr + " - " + newTestReport.name;
            if (numFails > 0)
                testLineOutput += " - " + newTestReport.message;
            console.log(testLineOutput);

            // Have to write the duration at the end of each test, because I don't get my done callback below until too-late
            exports.PfTestReport[0].time = (new Date().getTime() - start) / 1000.0;
        },

        done: function (assertions) {
            console.log("Testing complete: " + exports.PfTestReport[0].tests + " test run, "
                + (exports.PfTestReport[0].tests - exports.PfTestReport[0].failures)
                + " tests passed, " + exports.PfTestReport[0].failures + " tests failed.");
        }
    };

    if (files && files.length) {
        var paths = files.map(function (p) {
            return path.resolve(p);
        });
        nodeunit.runFiles(paths, opts);
    } else {
        nodeunit.runModules(files, opts);
    }
};
