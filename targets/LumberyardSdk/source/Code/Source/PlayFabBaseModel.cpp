#include "StdAfx.h"
#include "PlayFabBaseModel.h"

#include <rapidjson/stringbuffer.h>
#include <AzCore/JSON/document.h>

using namespace PlayFab;
using namespace rapidjson;

#ifdef GetObject // wingdi.h is extremely impollite and #defined a common function name, breaking RapidJson.  How rude.
#undef GetObject
#endif

Aws::String PlayFabBaseModel::toJSONString()
{
    GenericStringBuffer< UTF8<> > buffer;
    PFStringJsonWriter writer(buffer);
    writeJSON(writer);
    return buffer.GetString();
}

void MultitypeVar::writeJSON(PFStringJsonWriter& writer)
{
    switch (mType)
    {
    case MultitypeNull:
        writer.Null();
        break;
    case MultitypeBool:
        writer.Bool(mBool);
        break;
    case MultitypeNumber:
        writer.Double(mNumber);
        break;
    case MultitypeString:
        writer.String(mString.c_str());
        break;
    }
}

bool MultitypeVar::readFromValue(const rapidjson::Value& obj)
{
    if (obj.IsNull())
    {
        mType = MultitypeNull;
    }
    else if (obj.IsBool())
    {
        mType = MultitypeBool;
        mBool = obj.GetBool();
    }
    else if (obj.IsNumber())
    {
        mType = MultitypeNumber;
        mNumber = obj.GetDouble();
    }
    else if (obj.IsString())
    {
        mType = MultitypeNumber;
        mString = obj.GetString();
    }
    else
    {
        mType = MultitypeNull;
        return false;
    }
    return true;
}

void PlayFab::writeDatetime(time_t datetime, PFStringJsonWriter& writer)
{
    char buff[40];
    strftime(buff, 40, "%Y-%m-%dT%H:%M:%S.000Z", gmtime(&datetime));
    writer.String(buff);
}

time_t PlayFab::readDatetime(const rapidjson::Value& obj)
{
    Aws::String enumStr = obj.GetString();

    tm timeStruct = {};
    unsigned int milliseconds = 0; // milliseconds are truncated in a standard time_t structure
    sscanf(enumStr.c_str(), "%u-%u-%uT%u:%u%u.%uZ", &timeStruct.tm_year, &timeStruct.tm_mon, &timeStruct.tm_mday,
        &timeStruct.tm_hour, &timeStruct.tm_min, &timeStruct.tm_sec, &milliseconds);
    timeStruct.tm_year -= 1900;
    timeStruct.tm_mon -= 1;

    return mktime(&timeStruct);
}

bool PlayFabBaseModel::DecodeRequest(PlayFabRequest* request)
{
    bool result = false;

    // Check for bad responses
    if (request->mResponseSize != 0 // Not a null response
        && request->mResponseJson->GetParseError() == NULL) // Proper json response
    {
        // Check if the returned json indicates an error
        auto end = request->mResponseJson->MemberEnd();
        auto errorCodeJson = request->mResponseJson->FindMember("errorCode");
        auto data = request->mResponseJson->FindMember("data");

        // There should be no error code, data should exist, and be properly formatted
        result = errorCodeJson == end && data != end && data->value.IsObject();
    }

    if (!result)
        request->HandleErrorReport();

    // API will parse the result data object into the known object type (We don't know it here)
    return result;
}
