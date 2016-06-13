
#include "PlayFabBaseModel.h"
#include <ctime>

using namespace PlayFab;
using namespace rapidjson;

std::string PlayFabBaseModel::toJSONString()
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
    case MultitypeJsonObject:
        mObj->writeJSON(writer);
        break;
    case MultitypeError:
    default:
        writer.String("MultitypeError");
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
        mType = MultitypeString;
        mString = obj.GetString();
    }
    else // if (obj.IsObject()) - or just something else
    {
        // If you're here, you are trying to deserialize a real (and type-unknown) object into an abstract container, and that doesn't work in C++
        // TODO: Our best workaround may be to give you back the json, because we can't assign mObj with anything meaningful - Someday
        mType = MultitypeError;
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
    std::string enumStr = obj.GetString();

    tm timeStruct = {};
    unsigned int milliseconds = 0; // milliseconds are truncated in a standard time_t structure
    sscanf(enumStr.c_str(), "%u-%u-%uT%u:%u%u.%uZ", &timeStruct.tm_year, &timeStruct.tm_mon, &timeStruct.tm_mday,
        &timeStruct.tm_hour, &timeStruct.tm_min, &timeStruct.tm_sec, &milliseconds);
    timeStruct.tm_year -= 1900;
    timeStruct.tm_mon -= 1;

    return mktime(&timeStruct);
}
