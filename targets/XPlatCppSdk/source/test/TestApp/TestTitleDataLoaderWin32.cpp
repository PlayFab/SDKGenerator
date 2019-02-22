// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"

#include <fstream>
#include "TestTitleDataLoader.h"

namespace PlayFabUnit
{
    // Partial class implementation of TestTitleDataLoader.
    // Each platform gets its own file and implementation of TestTitleDataLoader::LoadTestJson(),
    // since the file handling logic is likely to be very different on all of them.
    bool TestTitleDataLoader::LoadTestJson(std::shared_ptr<char*>& testDataJson, size_t& testDataJsonLen)
    {
        // Get the path to the test data file from the current environment vars.
        std::string titleDataPath;

        {
            char* titleDataPathCStr = nullptr;
            size_t titleDataPathCStrLen;
            errno_t err = _dupenv_s(&titleDataPathCStr, &titleDataPathCStrLen, "PF_TEST_TITLE_DATA_JSON");

            if ((0 != err) || (nullptr == titleDataPathCStr) || (0 == titleDataPathCStrLen))
                return false;

            titleDataPath = titleDataPathCStr;

            delete[] titleDataPathCStr;
        }

        // Read the title data from the file into the output character array.
        std::ifstream titleDataFile;
        titleDataFile.open(titleDataPath, std::ios::binary | std::ios::in);

        if (!titleDataFile)
        {
            return false;
        }

        auto begin = titleDataFile.tellg();
        titleDataFile.seekg(0, std::ios::end);
        auto end = titleDataFile.tellg();
        testDataJsonLen = static_cast<int>(end - begin);
        testDataJson = std::make_shared<char*>(new char[testDataJsonLen + 1]);

        titleDataFile.seekg(0, std::ios::beg);
        titleDataFile.read(*testDataJson, testDataJsonLen);
        (*testDataJson)[testDataJsonLen] = '\0';

        titleDataFile.close();

        return true;
    }
}