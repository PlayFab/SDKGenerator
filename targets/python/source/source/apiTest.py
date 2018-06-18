# idea here is to include PlayFabSettings, set them,
# include API.py (or PlayFabSErverAPI.py) and see if you can call a function out of it
import PlayFabSettings
import PlayFabServerAPI
#import PlayFabClientModels
import PlayFabClientAPI

import asyncio

PlayFabSettings.TitleId = "9D63"
PlayFabSettings.SdkVersionString = "4"
customId = "8fa79815413d472d"

#request = PlayFabClientModels.LoginWithCustomIDRequest()
request = {}

request["CreateAccount"] = True
request["CustomId"] = customId
request["TitleId"] = PlayFabSettings.TitleId
request["LoginTitlePlayerAccountEntity"] = True

customData = ""
extraHeaders = {}

#loop = asyncio.get_event_loop()  
#loop.run_until_complete(PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders))  
#loop.close()  
testLogin = PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders)

PlayFabSettings.ClientSessionTicket = testLogin["ClientSessionTicket"]
extraHeaders["X-Authentication"] = testLogin["ClientSessionTicket"]

#userRequest = PlayFabClientModels.GetUserDataRequest()
userRequest = {}

userRequest["PlayFabId"] = testLogin["PlayFabId"]

testGetUserData = PlayFabClientAPI.GetUserDataAsync(userRequest, customData, extraHeaders)
print(testGetUserData)

charUpdateRequest ={
  "CharacterId": "98765456",
  "Data": {
    "Class": "Fighter",
    "Gender": "Female",
    "Icon": "Guard 3",
    "Theme": "Colorful"
  },
  "Permission": "Public"
}

charUpdateRequest["PlayFabId"] = testLogin["PlayFabId"]
# charUpdateRequest["CharacterId"] = "" # how do we create this?
testGetUserData = PlayFabClientAPI.UpdateCharacterDataAsync(charUpdateRequest, customData, extraHeaders)
print(testGetUserData)

charRequest = {}

charRequest["PlayFabId"] = testLogin["PlayFabId"]
charRequest["CharacterId"] = "a" # how do we create this?
testGetUserData = PlayFabClientAPI.GetCharacterDataAsync(charRequest, customData, extraHeaders)
print(testGetUserData)

