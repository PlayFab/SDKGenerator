//////////////////////////////////////////////////////////////////////////////////////////////
// This files holds the code for the play fab base model.
//////////////////////////////////////////////////////////////////////////////////////////////

#include "PlayFabPrivatePCH.h"
#include "PlayFabBaseModel.h"

void FPlayFabError::decodeError(UPlayFabJsonObject* responseData)
{
    // Check if we have an error
    if (int(responseData->GetNumberField("code")) != 200) // We have an error
    {
        hasError = true;
        ErrorCode = int(responseData->GetNumberField("errorCode"));
        ErrorName = responseData->GetStringField("error");
        ErrorMessage = responseData->GetStringField("errorMessage");
        auto detailsObj = responseData->GetObjectField("errorDetails");
        ErrorDetails = "";
        int count = 0;
        for (auto detailParamPair = detailsObj->GetRootObject()->Values.CreateConstIterator(); detailParamPair; ++detailParamPair)
        {
            auto errorArray = detailParamPair->Value->AsArray();
            for (auto paramMsg = errorArray.CreateConstIterator(); paramMsg; ++paramMsg)
            {
                if (count != 0)
                    ErrorDetails += "\n";
                ErrorDetails += detailParamPair->Key;
                ErrorDetails += ": ";
                ErrorDetails += paramMsg->Get()->AsString();
                count++;
            }
        }
    }
    else { hasError = false; }
}
