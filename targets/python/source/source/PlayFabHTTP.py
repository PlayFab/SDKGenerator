# using System.Threading.Tasks;
from enum import Enum
import requests
import PlayFabSettings
from json import JSONEncoder
import json
import PlayFabErrors

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

class PlayFabJsonError(Enum):
    def __init__(self):
        code = 0
        status = ""
        error = ""
        errorCode = 0
        errorMessage = ""
        errorDetails = None

class PlayFabJsonSuccess:
    def __init__(self):
        code = 0
        status = ""
        data = None

def DoPost(urlPath, request, authType, authKey, extraHeaders):
    if PlayFabSettings.TitleId == None:
        raise Exception("You must set your titleId before making an api call")

    url = "" + PlayFabSettings.GetURL() + "" + urlPath

    #j = json.dumps(request.__dict__, cls=PythonObjectEncoder)
    j = json.dumps(request)

    requestHeaders = {}

    requestHeaders["Content-Type"] = "application/json"
    #requestHeaders["X-PlayFabSDK"] = PlayFabSettings.SdkVersionString

    for k, v in extraHeaders.items():
        requestHeaders[k] = extraHeaders[k]

    response = requests.post(url, data=j, headers=requestHeaders)

    if response.status_code != 200:
        return PlayFabErrors.PlayFabError()

    return response
