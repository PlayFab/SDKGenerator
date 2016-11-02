#include <fstream>
#include "CppUnitTest.h"
#include "playfab/PlayFabAdminDataModels.h"

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace rapidjson;
using namespace PlayFab;
using namespace AdminModels;

#pragma comment(lib, "wldap32.lib")
#pragma comment(lib, "ws2_32.lib")

#if(_DEBUG)
#pragma comment(lib, "libcurld.lib")
#pragma comment(lib, "libeay32d.lib")
#pragma comment(lib, "ssleay32d.lib")
#pragma comment(lib, "zlibd.lib")
#pragma comment(lib, "PlayFabAllAPId.lib")
#else
#pragma comment(lib, "libcurl.lib")
#pragma comment(lib, "libeay32.lib")
#pragma comment(lib, "ssleay32.lib")
#pragma comment(lib, "zlib.lib")
#pragma comment(lib, "PlayFabAllAPI.lib")
#endif

namespace UnittestRunner
{
    // These tests are not useful for SDK-Users
    // Feel free to ignore or delete this file
    // Specifically, they test specific internal workings in the SDK which have need of testing,
    //   or are related to bugs that have been found and fixed.
    TEST_CLASS(PlayFabInternalTests)
    {
    public:
        TEST_CLASS_INITIALIZE(ClassInitialize)
        {
        }
        TEST_CLASS_CLEANUP(ClassCleanup)
        {
        }

        // BUGFIX: PFWORKBIN-293
        TEST_METHOD(ReadUserDataObj)
        {
            UserDataRecord record;

            {
                // Test that the member fields exist, but are null, instead of the expected datatype
                char* testinput = "{\"test\": {\"Value\": null, \"LastUpdated\": null, \"Permission\": null}}";
                Document testDoc;
                testDoc.Parse<0>(testinput);
                Assert::IsTrue(testDoc.GetParseError() == NULL);
                auto testvalue = testDoc.FindMember("test");
                record.readFromValue(testvalue->value);
                // Assert::IsFalse(record.readFromValue(testvalue->value)); // TODO: At some point I'd like this output to be useful
            }

            {
                // Test that normal expected data parses correctly
                char* testinput = "{\"test\": {\"Value\": \"asdf\", \"LastUpdated\": \"2015-08-11 12:00.00.00\", \"Permission\": \"Public\"}}";
                Document testDoc;
                testDoc.Parse<0>(testinput);
                Assert::IsTrue(testDoc.GetParseError() == NULL);
                auto testvalue = testDoc.FindMember("test");
                record.readFromValue(testvalue->value);
                // Assert::IsTrue(record.readFromValue(testvalue->value)); // TODO: At some point I'd like this output to be useful
            }
        }

    private:
    };
}
