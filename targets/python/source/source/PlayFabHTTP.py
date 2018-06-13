# using System.Threading.Tasks;

import requests

class PlayFabInternal:
    # This is a base-class for all Api-request objects.
    # It is currently unfinished, but we will add result-specific properties,
    #   and add template where-conditions to make some code easier to follow
    class PlayFabRequestCommon:
        pass

    # This is a base-class for all Api-result objects.
    # It is currently unfinished, but we will add result-specific properties,
    # and add template where-conditions to make some code easier to follow
    class PlayFabResultCommon:
        pass

    class PlayFabJsonError(Enum):
        def __init__(self):
            code = 0
            status = ""
            error = ""
            errorCode = 0
            errorMessage = ""
            errorDetails = []

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

async def DoPost(urlPath, request, authType, authKey, extraHeaders):
    if PlayFabSettings.TitleId == None:
        raise Exception("You must set your titleId before making an api call")

    response = requests.post(loginurl, data=json.dumps(loginPayload), headers=extraHeaders)

    #return await _http.DoPost(urlPath, request, authType, authKey, extraHeaders)
