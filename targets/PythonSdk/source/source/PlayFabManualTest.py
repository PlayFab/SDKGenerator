# idea here is to include PlayFabSettings, set them,
# include API.py (or PlayFabSErverAPI.py) and see if you can call a function
# out of it
import PlayFabSettings
import PlayFabEntityAPI
import PlayFabServerAPI
import PlayFabClientAPI
import PlayFabManualTestSettings

PlayFabSettings.TitleId = PlayFabManualTestSettings.TitleId
PlayFabSettings.SdkVersionString = PlayFabManualTestSettings.SdkVersionString
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
