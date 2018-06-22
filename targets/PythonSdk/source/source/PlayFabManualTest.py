# idea here is to include PlayFabSettings, set them,
# include API.py (or PlayFabSErverAPI.py) and see if you can call a function
# out of it
import PlayFabErrors
import PlayFabEntityAPI
import PlayFabSettings
import PlayFabServerAPI
import PlayFabClientAPI
import PlayFabManualTestSettings

PlayFabSettings.TitleId = PlayFabManualTestSettings.TitleId
customId = PlayFabManualTestSettings.customId

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


PlayFabClientAPI.LoginWithCustomID(request, loginCallback, customData, extraHeaders)


def entityTokenCallback(success, fail):
    global EntityKey
    if fail:
        print(fail)
    else:
        EntityKey = success["Entity"]
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

eoRequest2 = {
    "Entity" : EntityKey
}
PlayFabEntityAPI.GetObjects(eoRequest2, entityObjectCallback, customData, extraHeaders)

def titleDataReqCallback(success, fail):
    if fail:
        print(fail)
    else:
        print(success)


try:
    titleDataRequest = {}
    PlayFabServerAPI.GetTitleData(titleDataRequest, titleDataReqCallback, customData, extraHeaders)
except PlayFabErrors.PlayFabException as e:
    print("Caught expected error")
    PlayFabSettings.GlobalExceptionLogger(e)

PlayFabSettings.DeveloperSecretKey = PlayFabManualTestSettings.DeveloperSeceretKey

titleDataRequest2 = {}
PlayFabServerAPI.GetTitleData(titleDataRequest, titleDataReqCallback, customData, extraHeaders)