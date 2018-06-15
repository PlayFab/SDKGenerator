# using System.Threading.Tasks;
from enum import Enum
import requests
import PlayFabSettings
from json import JSONEncoder
import PlayFabJson
import PlayFabErrors

class MyEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, PlayFabBaseObject):
            return JSONEncoder.default(self, dict(o.__dict__))
        elif isinstance(o, datetime):
            return "this is a timestamp"

        # not handling iterables, enums, 

        return JSONEncoder.default(self, o)

MyEncoderInstance = MyEncoder()

class PlayFabBaseObject:
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
        data = None # ideally is a PlayFabResultCommon

#class PlayFabHttp:
    #private static readonly IPlayFabHttp _http;

    #def __init__:
    #    types = typeof(PlayFabHttp).GetAssembly().GetTypes()
    #    foreach (var eachType in types)
    #        if (httpInterfaceType.IsAssignableFrom(eachType) && !eachType.IsAbstract):
    #            _http = (IPlayFabHttp)Activator.CreateInstance(eachType.AsType());
    #            return;

    #    raise Exception("Cannot find a valid IPlayFabHttp type");

#async def DoPost(urlPath, request, authType, authKey, extraHeaders):
def DoPost(urlPath, request, authType, authKey, extraHeaders):
    # TODO uncomment this...???? TitleId is defined in test, but we include settings directly in this file...???? (so we won't get that set here?)
    #if PlayFabSettings.TitleId == None:
    #    raise Exception("You must set your titleId before making an api call")

    url = "" + PlayFabSettings.GetURL() + "" + urlPath

    response = requests.post(url, data=MyEncoderInstance.encode(request), headers=extraHeaders)

    if response != 200:
        return PlayFabErrors.PlayFab.PlayFabError()

    json_data = json.loads(response.text)

    #return await _http.DoPost(urlPath, request, authType, authKey, extraHeaders)
