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
        ErrorDetails = responseData->GetStringField("errorDetails");
    }
    else { hasError = false; }

}