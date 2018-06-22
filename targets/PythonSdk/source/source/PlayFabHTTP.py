import json
import PlayFabSettings
import PlayFabErrors
import requests

# Note this is a blocking call and will always run synchronously
# the return type is a dictionary that should contain a valid dictionary that should reflect the expected JSON response
# if the call fails, there will be a returned PlayFabError
def DoPost(urlPath, request, authKey, authVal, extraHeaders, callback):
    url = PlayFabSettings.GetURL(urlPath)

    try:
        j = json.dumps(request)
    except e:
        raise PlayFabErrors.PlayFabException("The given request is not json serializable. {}".format(e))

    requestHeaders = {}

    if extraHeaders:
        requestHeaders.update(extraHeaders)

    requestHeaders["Content-Type"] = "application/json"
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings.SdkVersionString
    requestHeaders["X-ReportErrorAsSuccess"] = "true"; # Makes processing PlayFab errors a little easier

    if authKey:
        requestHeaders[authKey] = authVal

    response = requests.post(url, data=j, headers=requestHeaders)

    if response.status_code != 200:
        newError = PlayFabErrors.PlayFabError()
        newError.code = response.status_code
        newError.errorCode = PlayFabErrors.PlayFabErrorCode.ServiceUnavailable
        newError.errorMessage = "HTTP request never reached Playfab server"
        return  newError

    resp = json.loads(response.content.decode("utf-8"))

    if resp["code"] != 200:
        return PlayFabErrors.PlayFabError(resp)

    data = resp["data"]

    if type(data) is PlayFabErrors.PlayFabError:
        error = data

        callGlobalErrorHandler(error)

        try:
            callback(None, error)
            return
        except:
            raise PlayFabErrors.PlayFabException("HTTP Response returned an error after callback function failed")

    try:
        callback(data, None)
    except:
        callGlobalErrorHandler(error)
        raise PlayFabErrors.PlayFabException("Successful callback failed")

def callGlobalErrorHandler(error):
    if PlayFabSettings.GlobalErrorHandler:
        try:
            PlayFabSettings.GlobalErrorHandler(error)
        except:
            raise PlayFabErrors.PlayFabException("Custom PlayFabSettings.GlobalErrorHandler failed execution")
