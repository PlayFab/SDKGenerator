-- PlayFabHttps_Corona.lua
--
-- Corona HTTPS implementation for PlayFab LuaSdk
-- This implementation is specifically for running a Corona project, and won't work anywhere else

local json = require("PlayFab.json")
local PlayFabSettings = require("PlayFab.PlayFabSettings")
local network = require("network") -- Corona network

local PlayFabHttps_Corona = {
}

local function InternalCallbackWrapper(onSuccess, onError)
    return function(httpResponse)
        if (not httpResponse.isError and httpResponse.status == 200) then
            local _, response = pcall(json.decode, httpResponse.response or "null")
            if (response and response.code == 200 and response.data and onSuccess) then
                onSuccess(response.data)
            elseif (response and onError) then
                onError(response)
            elseif (onError) then
                onError({
                    code = httpResponse.status,
                    status = httpResponse.status, -- TODO: this is supposed to be the string value for the status code
                    errorCode = 1123,
                    error = "ServiceUnavailable",
                    errorMessage = "Could not deserialize reseponse from server: " .. tostring(httpResponse.response)
                })
            end
        elseif (onError) then
            onError({
                code = httpResponse.status,
                status = httpResponse.status, -- TODO: this is supposed to be the string value for the status code
                errorCode = 1123,
                error = "ServiceUnavailable",
                errorMessage = "Could not deserialize reseponse from server: " .. tostring(httpResponse.response)
            })
        end
    end
end

function PlayFabHttps_Corona.MakePlayFabApiCall(urlPath, request, authKey, authValue, onSuccess, onError)
    local ok, requestJson = pcall(json.encode, request)
    if not ok then
        error(requestJson or "request could not be converted to json")
    end

    local requestHeaders = {
        ["X-ReportErrorAsSuccess"] = "true",
        ["X-PlayFabSDK"] = PlayFabSettings._internalSettings.sdkVersionString,
        ["Content-Type"] = "application/json"
        -- ["content-length"] = tostring(string.len(requestStr)) -- probably not needed for this one
    }
    if (authKey) then
        requestHeaders[authKey] = authValue
    end

    local fullUrl = "https://" .. PlayFabSettings.settings.titleId .. ".playfabapi.com/" .. urlPath

    network.request(
        fullUrl,
        "POST", -- All PlayFab APIs are POST
        InternalCallbackWrapper(onSuccess, onError),
        {
            headers = requestHeaders,
            body = requestJson,
        }
    )
end

return PlayFabHttps_Corona
