import json
import playfab.PlayFabSettings as PlayFabSettings
import playfab.PlayFabErrors as PlayFabErrors
import requests

# Note this is a blocking call and will always run synchronously
# the return type is a dictionary that should contain a valid dictionary that
# should reflect the expected JSON response
# if the call fails, there will be a returned PlayFabError
def DoPost(urlPath, request, authKey, authVal, callback, customData = None, extraHeaders = None):
    url = PlayFabSettings.GetURL(urlPath)

    try:
        j = json.dumps(request)
    except Exception as e:
        raise PlayFabErrors.PlayFabException("The given request is not json serializable. {}".format(e))

    requestHeaders = {}

    if extraHeaders:
        requestHeaders.update(extraHeaders)

    requestHeaders["Content-Type"] = "application/json"
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings._internalSettings.SdkVersionString
    requestHeaders["X-ReportErrorAsSuccess"] = "true" # Makes processing PlayFab errors a little easier

    if authKey and authVal:
        requestHeaders[authKey] = authVal

    httpResponse = requests.post(url, data=j, headers=requestHeaders)

    error = response = None

    if httpResponse.status_code != 200:
        # Failed to contact PlayFab Case
        error = PlayFabErrors.PlayFabError()

        error.HttpCode = httpResponse.status_code
        error.HttpStatus = httpResponse.reason
    else:
        # Contacted playfab
        responseWrapper = json.loads(httpResponse.content.decode("utf-8"))
        if responseWrapper["code"] != 200:
            # contacted PlayFab, but response indicated failure
            error = responseWrapper 
        else:
            # successful call to PlayFab
            response = responseWrapper["data"]

    if error and callback:
        callGlobalErrorHandler(error)

        try:
            callback(None, error) # Notify the caller about an API Call failure
        except Exception as e:
            PlayFabSettings.GlobalExceptionLogger(e) # Global notification about exception in caller's callback
    elif response and callback:
        try:
            callback(response, None) # Notify the caller about an API Call success
        except Exception as e:
            PlayFabSettings.GlobalExceptionLogger(e) # Global notification about exception in caller's callback

def callGlobalErrorHandler(error):
    if PlayFabSettings.GlobalErrorHandler:
        try:
            PlayFabSettings.GlobalErrorHandler(error) # Global notification about an API Call failure
        except Exception as e:
            PlayFabSettings.GlobalExceptionLogger(e) # Global notification about exception in caller's callback
