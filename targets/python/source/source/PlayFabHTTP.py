# using System.Threading.Tasks;
from enum import Enum
import requests
import PlayFabSettings
from json import JSONEncoder
import json
import PlayFabJson
import PlayFabErrors
import pickle

class PythonObjectEncoder(json.JSONEncoder):
    def default(self, obj):
        return {'_python_object': pickle.dumps(obj).decode('latin1')}

class Serializable(dict):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # hack to fix _json.so make_encoder serialize properly
        self.__setitem__('dummy', 1)

    def _myattrs(self):
        return [
            (x, self._repr(getattr(self, x))) 
            for x in self.__dir__() 
            if x not in Serializable().__dir__()
        ]

    def _repr(self, value):
        if isinstance(value, (str, int, float, list, tuple, dict)):
            return value
        else:
            return repr(value)

    def __repr__(self):
        return '<%s.%s object at %s>' % (
            self.__class__.__module__,
            self.__class__.__name__,
            hex(id(self))
        )

    def keys(self):
        return iter([x[0] for x in self._myattrs()])

    def values(self):
        return iter([x[1] for x in self._myattrs()])

    def items(self):
        return iter(self._myattrs())


class MyEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, PlayFabBaseObject):
            return JSONEncoder.default(self, dict(o.__dict__))
        elif isinstance(o, datetime):
            return "this is a timestamp"

        # not handling iterables, enums, 

        return JSONEncoder.default(self, o)

MyEncoderInstance = MyEncoder()

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
    # TODO uncomment this...???? TitleId is defined in test, but we include settings directly in this file...???? (so we won't get that set here?, it's set to nothing)
    #if PlayFabSettings.TitleId == None:
    #    raise Exception("You must set your titleId before making an api call")

    url = "" + PlayFabSettings.GetURL() + "" + urlPath

    #response = requests.post(url, data=MyEncoderInstance.encode(request), headers=extraHeaders)
    #j = json.dumps(request.__dict__)
    objAsDict = request.__dict__

    # TODO: go through each object of objAsDict and turn those into dictionaries as well?

    j = json.dumps(request.__dict__, cls=PythonObjectEncoder)
    #j = objAsDict #json.dumps(objAsDict)
    #print(j)

    requestHeaders = {"Content-Type": "application/json"}

    #requestHeaders["Content-Type"] = "application/json"
    #requestHeaders[authType] = authKey
    #requestHeaders["X-PlayFabSDK"] = PlayFabSettings.SdkVersionString

    # TODO: this needs to be figured out. What class type is extraHeaders?
    #for h in extraHeaders.iterkeys:
    #    requestHeaders[h] = extraHeaders[h]
        

    response = requests.post(url, data=j, headers=requestHeaders)

    #print(response._content)

    if response.status_code != 200:
        return PlayFabErrors.PlayFabError()

    return response
    #json_data = json.loads(response.text)

    #return await _http.DoPost(urlPath, request, authType, authKey, extraHeaders)
