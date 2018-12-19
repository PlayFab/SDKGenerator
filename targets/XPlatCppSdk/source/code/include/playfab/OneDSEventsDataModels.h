#pragma once

#ifndef DISABLE_PLAYFABENTITY_API

#include <playfab/PlayFabBaseModel.h>
#include <playfab/PlayFabJsonHeaders.h>

namespace PlayFab
{
    namespace EventsModels
    {
        struct TelemetryIngestionConfigRequest : public PlayFabRequestCommon
        {

            TelemetryIngestionConfigRequest() :
                PlayFabRequestCommon()
            {}

            TelemetryIngestionConfigRequest(const TelemetryIngestionConfigRequest&) :
                PlayFabRequestCommon()
            {}

            ~TelemetryIngestionConfigRequest() = default;

            void FromJson(Json::Value&) override
            {
            }

            Json::Value ToJson() const override
            {
                Json::Value output;
                return output;
            }
        };

        struct TelemetryIngestionConfigResponse : public PlayFabResultCommon
        {
            std::string IngestionKey;
            std::string TelemetryJwtHeaderKey;
            std::string TelemetryJwtHeaderPrefix;
            std::string TelemetryJwtToken;
            std::string TenantId;

            TelemetryIngestionConfigResponse() :
                PlayFabResultCommon(),
                IngestionKey(),
                TelemetryJwtHeaderKey(),
                TelemetryJwtHeaderPrefix(),
                TelemetryJwtToken(),
                TenantId()
            {}

            TelemetryIngestionConfigResponse(const TelemetryIngestionConfigResponse& src) :
                PlayFabResultCommon(),
                IngestionKey(src.IngestionKey),
                TelemetryJwtHeaderKey(src.TelemetryJwtHeaderKey),
                TelemetryJwtHeaderPrefix(src.TelemetryJwtHeaderPrefix),
                TelemetryJwtToken(src.TelemetryJwtToken),
                TenantId(src.TenantId)
            {}

            ~TelemetryIngestionConfigResponse() = default;

            void FromJson(Json::Value& input) override
            {
                FromJsonUtilS(input["IngestionKey"], IngestionKey);
                FromJsonUtilS(input["TelemetryJwtHeaderKey"], TelemetryJwtHeaderKey);
                FromJsonUtilS(input["TelemetryJwtHeaderPrefix"], TelemetryJwtHeaderPrefix);
                FromJsonUtilS(input["TelemetryJwtToken"], TelemetryJwtToken);
                FromJsonUtilS(input["TenantId"], TenantId);
            }

            Json::Value ToJson() const override
            {
                Json::Value output;
                Json::Value each_IngestionKey; ToJsonUtilS(IngestionKey, each_IngestionKey); output["IngestionKey"] = each_IngestionKey;
                Json::Value each_TelemetryJwtHeaderKey; ToJsonUtilS(TelemetryJwtHeaderKey, each_TelemetryJwtHeaderKey); output["TelemetryJwtHeaderKey"] = each_TelemetryJwtHeaderKey;
                Json::Value each_TelemetryJwtHeaderPrefix; ToJsonUtilS(TelemetryJwtHeaderPrefix, each_TelemetryJwtHeaderPrefix); output["TelemetryJwtHeaderPrefix"] = each_TelemetryJwtHeaderPrefix;
                Json::Value each_TelemetryJwtToken; ToJsonUtilS(TelemetryJwtToken, each_TelemetryJwtToken); output["TelemetryJwtToken"] = each_TelemetryJwtToken;
                Json::Value each_TenantId; ToJsonUtilS(TenantId, each_TenantId); output["TenantId"] = each_TenantId;
                return output;
            }
        };
    }
}

#endif
