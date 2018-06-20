ProductionEnvironmentURL = ".playfabapi.com"
TitleId = "" # You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
GlobalErrorHandler = None
EntityToken = None # Internal variable used for Entity API Access (basically Entity Login)
DeveloperSecretKey = None # You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
ClientSessionTicket = None # This is set
SdkVersionString = "PythonSdk-<%- sdkVersion %>";
SdkVersionString = ""

# Client specifics
AdvertisingIdType = "" # Set this to the appropriate AD_TYPE_X constant below
AdvertisingIdValue = None # Set this to corresponding device value

# DisableAdvertising is provided for completeness, but changing it is not suggested
# Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
DisableAdvertising = False
AD_TYPE_IDFA = "Idfa"
AD_TYPE_ANDROID_ID = "Adid"

def GetURL(methodUrl):
    baseUrl = ProductionEnvironmentURL
    url = "{}{}{}{}".format("https://", TitleId ,baseUrl, methodUrl)
    if baseUrl.find("http") == 0:
        return baseUrl
    return url
