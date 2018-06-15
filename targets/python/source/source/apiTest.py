# idea here is to include PlayFabSettings, set them,
# include API.py (or PlayFabSErverAPI.py) and see if you can call a function out of it
import PlayFabSettings
import PlayFabServerAPI
import PlayFabClientModels
import PlayFabClientAPI

import asyncio

PlayFabSettings.TitleId = "9D63"
PlayFabSettings.SdkVersionString = "4"
customId = "8fa79815413d472d"

request = PlayFabClientModels.LoginWithCustomIDRequest()

request.CreateAccount = True
request.CustomId = customId
request.TitleId = PlayFabSettings.TitleId
request.LoginTitlePlayerAccountEntity = True

customData = ""
extraHeaders = {}

#loop = asyncio.get_event_loop()  
#loop.run_until_complete(PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders))  
#loop.close()  
testLogin = PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders)

extraHeaders["X-Authentication"] = testLogin["ClientSessionTicket"]

userRequest = PlayFabClientModels.GetUserDataRequest()

userRequest.PlayFabId = testLogin.PlayFabId

testGetUserData = PlayFabClientAPI.GetUserData()
print(extraHeaders)
