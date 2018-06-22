import json
import PlayFabSettings
import PlayFabErrors
import requests

# Note this is a blocking call and will always run synchronously
# the return type is a dictionary that should contain a valid dictionary that
# should reflect the expected JSON response
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
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings._internalSettings.SdkVersionString
    requestHeaders["X-ReportErrorAsSuccess"] = "true" # Makes processing PlayFab errors a little easier

    if authKey:
        requestHeaders[authKey] = authVal

    httpResponse = requests.post(url, data=j, headers=requestHeaders)

    error = response = None

    if httpResponse.status_code != 200:
        # Failed to contact PlayFab Case
        error = PlayFabErrors.PlayFabError()
        error.code = response.status_code
        error.errorCode = PlayFabErrors.PlayFabErrorCode.ServiceUnavailable
        error.errorMessage = "HTTP request never reached Playfab server"
    else:
        # Contacted playfab
        responseWrapper = json.loads(httpResponse.content.decode("utf-8"))
        if responseWrapper["code"] != 200:
            # contacted PlayFab, but response indicated failure
            error = responseWrapper 
        else:
            # successful call to PlayFab
            response = responseWrapper["data"]

    if error:
        callGlobalErrorHandler(error)

        try:
            callback(None, error) # Notify the caller about an API Call failure
        except Exception as e:
            PlayFabSettings.GlobalExceptionLogger(e) # Global notification about exception in caller's callback
    elif response:
        try:
            callback(response, None) # Notify the caller about an API Call success
        except Exception as e:
            PlayFabSettings.GlobalExceptionLogger(e) # Global notification about exception in caller's callback

def callGlobalErrorHandler(error):
    if PlayFabSettings.GlobalErrorHandler:
        try:
            PlayFabSettings.GlobalErrorHandler(error) # Global notification about an API Call failure
        except:
            PlayFabSettings.GlobalExceptionLogger(e) # Global notification about exception in caller's callback
