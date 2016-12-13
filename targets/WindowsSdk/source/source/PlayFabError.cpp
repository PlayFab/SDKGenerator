#include "PlayFab/PlayFabError.h"

namespace PlayFab
{
    void PlayFabError::FromJson(web::json::value& input)
    {
        const web::json::value HttpCode_member = input[U("code")];
        if (!HttpCode_member.is_null()) HttpCode = HttpCode_member.as_integer();
        const web::json::value ErrorCode_member = input[U("errorCode")];
        if (!ErrorCode_member.is_null()) ErrorCode = PlayFabErrorCode(ErrorCode_member.as_integer());
        const web::json::value HttpStatus_member = input[U("status")];
        if (!HttpStatus_member.is_null()) HttpStatus = ShortenString(HttpStatus_member.as_string());
        const web::json::value ErrorName_member = input[U("error")];
        if (!ErrorName_member.is_null()) ErrorName = ShortenString(ErrorName_member.as_string());
        const web::json::value ErrorMessage_member = input[U("errorMessage")];
        if (!ErrorMessage_member.is_null()) ErrorMessage = ShortenString(ErrorMessage_member.as_string());
        ErrorDetails = input[U("errorDetails")];
        Data = input[U("data")];
    }

    web::json::value PlayFabError::ToJson() const
    {
        // This is not expected to be used, but implemented for completeness
        web::json::value output;
        output[U("code")] = web::json::value(HttpCode);
        output[U("errorCode")] = web::json::value(ErrorCode);
        output[U("status")] = web::json::value(WidenString(HttpStatus));
        output[U("error")] = web::json::value(WidenString(ErrorName));
        output[U("errorMessage")] = web::json::value(WidenString(ErrorMessage));
        output[U("errorDetails")] = ErrorDetails;
        output[U("data")] = Data;
        return output;
    }

    std::string PlayFabError::GenerateReport() const
    {
        std::string output;
        output._Grow(1024);
        output += ErrorMessage;
        if (!ErrorDetails.is_null() && ErrorDetails.is_object())
        {
            auto eachDetailPair = ErrorDetails.as_object();
            for (auto detailIter = eachDetailPair.cbegin(); detailIter != eachDetailPair.cend(); ++detailIter)
            {
                if (!detailIter->second.is_array()) continue;

                output += "\n";
                output += ShortenString(detailIter->first);
                output += ": ";
                auto eachValueArray = detailIter->second.as_array();
                int valueIndex = 0;
                for (auto valueIter = eachValueArray.cbegin(); valueIter != eachValueArray.cend(); ++valueIter)
                {
                    if (!valueIter->is_string()) continue;
                    if (valueIndex != 0) output += ", ";
                    output += ShortenString(valueIter->as_string());
                    valueIndex++;
                }
            }
        }
        return output;
    }
}
