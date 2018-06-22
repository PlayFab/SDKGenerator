# idea here is to include PlayFabSettings, set them,
# include API.py (or PlayFabSErverAPI.py) and see if you can call a function out of it
import PlayFabSettings
import PlayFabEntityAPI
import PlayFabServerAPI
import PlayFabClientAPI

PlayFabSettings.TitleId = "9D63"
PlayFabSettings.SdkVersionString = "4"
customId = "8fa79815413d472d"

request = {}

request["CreateAccount"] = True
request["CustomId"] = customId
request["TitleId"] = PlayFabSettings.TitleId
request["LoginTitlePlayerAccountEntity"] = True

customData = ""
extraHeaders = {}

def loginCallback(success, fail):
    if fail:
        print(fail)
    else:
        print(success)

#loop = asyncio.get_event_loop()  
#loop.run_until_complete(PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders))  
#loop.close()  
PlayFabClientAPI.LoginWithCustomID(request, loginCallback, customData, extraHeaders)

def entityTokenCallback(success, fail):
    if fail:
        print(fail)
    else:
        print(success)

etRequest = {}
PlayFabEntityAPI.GetEntityToken(etRequest, entityTokenCallback, customData, extraHeaders)

def entityObjectCallback(success, fail):
    if fail:
        print(fail)
    else:
        print(success)
        
# need to add entity id to this request
eoRequest = {}
PlayFabEntityAPI.GetObjects(etRequest, entityObjectCallback, customData, extraHeaders)

def titleDataReqCallback(success, fail):
    if fail:
        print(fail)
    else:
        print(success)

titleDataRequest = {}
PlayFabServerAPI.GetTitleData(titleDataRequest, titleDataReqCallback, customData, extraHeaders)
