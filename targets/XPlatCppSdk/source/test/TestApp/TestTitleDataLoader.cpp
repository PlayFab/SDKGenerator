// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <playfab/PlayFabJsonHeaders.h>
#include "TestTitleDataLoader.h"

namespace PlayFabUnit
{
    bool TestTitleDataLoader::Load(TestTitleData& titleData)
    {
        // Load JSON string in a platform-dependent way.
        std::shared_ptr<char*> titleJsonPtr;
        size_t size;
        const bool loadedSuccessfully = LoadTestJson(titleJsonPtr, size);

        if (!loadedSuccessfully)
            return false;

        // Parse JSON string into output TestTitleData.
        Json::CharReaderBuilder jsonReaderFactory;
        Json::CharReader* jsonReader(jsonReaderFactory.newCharReader());
        JSONCPP_STRING jsonParseErrors;
        Json::Value titleDataJson;
        const bool parsedSuccessfully = jsonReader->parse(*titleJsonPtr, *titleJsonPtr + size + 1, &titleDataJson, &jsonParseErrors);

        if (parsedSuccessfully)
        {
            titleData.titleId = titleDataJson["titleId"].asString();
            titleData.userEmail = titleDataJson["userEmail"].asString();
            titleData.developerSecretKey = titleDataJson["developerSecretKey"].asString();
        }

        return parsedSuccessfully;
    }
}