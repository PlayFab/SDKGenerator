#include "PlayFabPrivatePCH.h"
#include "PlayFabBaseModel.h"
#include "PlayFab.h"

using namespace PlayFab;

FString FPlayFabBaseModel::toJSONString() const
{
	FString JsonOutString;
	JsonWriter Json = TJsonWriterFactory<TCHAR, TPrettyJsonPrintPolicy<TCHAR> >::Create(&JsonOutString);
	writeJSON(Json);

	if (Json->Close())
	{
		// write log here
	}

	return JsonOutString;
}

void FMultitypeVar::writeJSON(JsonWriter& writer) const
{
	switch (mType)
	{
	case MultitypeNull:
		writer->WriteNull();
		break;
	case MultitypeBool:
		writer->WriteValue(mBool);
		break;
	case MultitypeNumber:
		writer->WriteValue(mNumber);
		break;
	case MultitypeString:
		writer->WriteValue(mString);
		break;
	}
}


bool FMultitypeVar::readFromValue(const TSharedPtr<FJsonValue>& value)
{
	if (value->IsNull())
	{
		mType = MultitypeNull;
	}
	else if (value->Type == EJson::Boolean)
	{
		mType = MultitypeBool;
		mBool = value->AsBool();
	}
	else if (value->Type == EJson::Number)
	{
		mType = MultitypeNumber;
		mNumber = value->AsNumber();
	}
	else if (value->Type == EJson::String)
	{
		mType = MultitypeNumber;
		mString = value->AsString();
	}
	else
	{
		mType = MultitypeNull;
		return false;
	}
	return true;
}

bool FMultitypeVar::readFromValue(const TSharedPtr<FJsonObject>& obj)
{
	return false;
}

void PlayFab::writeDatetime(FDateTime datetime, JsonWriter& writer)
{
	writer->WriteValue(datetime.ToIso8601());
}

FDateTime PlayFab::readDatetime(const TSharedPtr<FJsonValue>& value)
{
	FDateTime DateTimeOut;
	FString DateString = value->AsString();
	if (!FDateTime::ParseIso8601(*DateString, DateTimeOut))
	{
		UE_LOG(LogPlayFab, Error, TEXT("readDatetime - Unable to import FDateTime from Iso8601 String"));
	}

	return DateTimeOut;
}
