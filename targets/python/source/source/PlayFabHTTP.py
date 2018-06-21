import json
import PlayFabSettings
import PlayFabErrors
import requests

class PlayFabJsonError():
    def __init__(self, *args):
        if args.count == 1:
            self.fromJson(args[0])
        else:
            self.code = 0
            self.status = ""
            self.error = ""
            self.errorCode = 0
            self.errorMessage = errorMessage
            self.errorDetails = None

    def fromJson(self, other):
        print(other._content.decode("utf-8"))
        self.code = other.status_code
        self.status = other._content["status"]
        self.error = other._content["error"]
        self.errorCode = other._content["errorCode"]
        self.errorMessage = other._content["errorMessage"]
        self.errorDetails = other._content["headers"]

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
    except:
        err = PlayFabJsonError(request)
        return err

    requestHeaders = {}

    requestHeaders["Content-Type"] = "application/json"
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings.SdkVersionString

    requestHeaders.update(extraHeaders)

    response = requests.post(url, data=j, headers=requestHeaders)

    if response.status_code != 200:
        return PlayFabErrors.PlayFabError(response)

    return response
