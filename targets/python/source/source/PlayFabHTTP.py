import json
import PlayFabSettings
import PlayFabErrors
import requests

def DoPost(urlPath, request, authType, authKey, extraHeaders):
    if PlayFabSettings.TitleId == None:
        raise Exception("You must set your titleId before making an api call")

    url = PlayFabSettings.GetURL(urlPath)

    try:
        j = json.dumps(request)
    except:
        err = PlayFabJsonError(request)
        return err

    requestHeaders = {}

    requestHeaders["Content-Type"] = "application/json"
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings.SdkVersionString
    requestHeaders["X-ReportErrorAsSuccess"] = "true"; # Makes processing PlayFab errors a little easier

    requestHeaders.update(extraHeaders)

    response = requests.post(url, data=j, headers=requestHeaders)

    if response.status_code != 200:
        return PlayFabErrors.PlayFabError({}) # define error params here that indicate "never contacted playfab server"

    resp = json.loads(response.content.decode("utf-8"))

    if resp["code"] != 200:
        return PlayFabErrors.PlayFabError(resp)

    return resp["data"]
