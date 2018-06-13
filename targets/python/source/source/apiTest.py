# idea here is to include PlayFabSettings, set them,
# include API.py (or PlayFabSErverAPI.py) and see if you can call a function out of it
import PlayFabSettings
import PlayFabServerAPI
import PlayFabClientModels
import PlayFabClientAPI

import asyncio

TitleId = "9D63"
customId = "8fa79815413d472d"

request = PlayFabClientModels.LoginWithCustomIDRequest()

request.CreateAccount = True
request.CustomId = customId
request.TitleId = TitleId

customData = ""
extraHeaders = ""

#loop = asyncio.get_event_loop()  
#loop.run_until_complete(PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders))  
#loop.close()  
uhh = PlayFabClientAPI.LoginWithCustomIDAsync(request, customData, extraHeaders)

# is this retrieved by a login? Do we need to do that first?
DeveloperSeceretKey = ""