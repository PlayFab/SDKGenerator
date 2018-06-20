import json
import PlayFabSettings
import PlayFabErrors
import requests

class PlayFabBaseObject():
    pass

# This is a base-class for all Api-request objects.
# It is currently unfinished, but we will add result-specific properties,
#   and add template where-conditions to make some code easier to follow
class PlayFabRequestCommon(PlayFabBaseObject):
    pass

# This is a base-class for all Api-result objects.
# It is currently unfinished, but we will add result-specific properties,
# and add template where-conditions to make some code easier to follow
class PlayFabResultCommon(PlayFabBaseObject):
    pass

class PlayFabJsonError():
    def __init__(self):
        self.code = 0
        self.status = ""
        self.error = ""
        self.errorCode = 0
        self.errorMessage = ""
        self.errorDetails = None

class PlayFabJsonSuccess():
    def __init__(self):
        self.code = 0
        self.status = ""
        self.data = None

def DoPost(urlPath, request, authType, authKey, extraHeaders):
    if PlayFabSettings.TitleId == None:
        raise Exception("You must set your titleId before making an api call")

    url = PlayFabSettings.GetURL(urlPath)

    try:
        j = json.dumps(request)
    except v:
        err = PlayFabJsonError().errorMessage = "{}{}".format(v , request)
        return err

    requestHeaders = {}

    requestHeaders["Content-Type"] = "application/json"
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings.SdkVersionString

    requestHeaders.update(extraHeaders)

    response = requests.post(url, data=j, headers=requestHeaders)

    if response.status_code != 200:
        return PlayFabErrors.PlayFabError()

    return response
