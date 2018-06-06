import requests
import json

headers = {'content-type': 'application/json'}
# secerets = {'sessionTicket': '', 'seceretKey': '', 'entityToken':''}

titleId = "9D63"
customId = "8fa79815413d472d"

titleurl = 'https://'+titleId+'.playfabapi.com/'
authurl = titleurl + 'Authentication/'
clientApiUrl = titleurl + 'Client/'
eventApiUrl = titleurl + 'Event/'
loginurl = clientApiUrl + 'LoginWithCustomID'
getUserUrl = clientApiUrl + 'GetUserData'
updateUserUrl = clientApiUrl + 'UpdatePlayerStatistics'
getEntityTokenUrl = authurl + 'GetEntityToken'
getTitleDataUrl = clientApiUrl + 'GetTitleData'

loginPayload = {
  "CustomId": customId,
  "CreateAccount": True,
  "TitleId": titleId,
  "LoginTitlePlayerAccountEntity": True
}

response = requests.post(loginurl, data=json.dumps(loginPayload), headers=headers)

EntityToken = ""
Entity = ""

sessionticket = ""

# extract entity 
if (response.status_code == 200):
	json_data = json.loads(response.text)
	EntityToken = json_data["data"]["EntityToken"]["EntityToken"]
	Entity = json_data["data"]["EntityToken"]["Entity"]
	sessionticket = json_data["data"]["SessionTicket"]
	headers['X-Authentication'] = sessionticket

# headers = {'content-type': 'application/json', 'X-Authentication': sessionticket }

print(response.text) #TEXT/HTML
print(response.status_code, response.reason) #HTTP
print(EntityToken) #TEXT/HTML
print(Entity) #TEXT/HTML

arr = {'content-type': 'application/json', 'X-Authentication':sessionticket}

getTitleDataPayload = {
  "Keys": [
  ]
}

print("loginPayload")
print(loginPayload) #TEXT/HTML

response = requests.post(getTitleDataUrl, data=json.dumps(getTitleDataPayload), headers=arr)

print(response.text) #TEXT/HTML
print(response.status_code, response.reason) #HTTP

# getUserDataPayload = {
#   "Keys": [
#     "preferences",
#     "progress"
#   ]
# }

setUserDataPayload = {
  "Statistics": [
    {
      "StatisticName": "Points",
      "Version": 1,
      "Value" : 600
    }
  ]
}

response = requests.post(updateUserUrl, data=json.dumps(setUserDataPayload), headers=arr)

print(response.text) #TEXT/HTML
print(response.status_code, response.reason) #HTTP
