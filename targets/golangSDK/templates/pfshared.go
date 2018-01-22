package pfshared

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

type PlayFabSettings struct {
	SdkVersion      string
	BuildIdentifier string
	VersionString   string

	UseDevelopmentEnvironment bool
	DevelopmentEnvironmentURL string
	ProductionEnvironmentURL  string
	TitleID                   string

	// if ServerAPI || AdminAPI
	DeveloperSecretKey string

	// if ClientAPI
	AdvertisingIDType  string
	AdvertisingIDValue string
	DisableAdvertising bool
	AD_TYPE_IDFA       string
	AD_TYPE_ANDROID_ID string

	serverURL string
}

type playFabResultBody struct {
	Code   uint
	Status string
	Data   interface{}

	Error        string
	ErrorCode    string
	ErrorMessage string
}

type APIResponse struct {
	Code         int
	Status       string
	Data         interface{}
	Error        string
	ErrorCode    int
	ErrorMessage string
}

type internalSettingsContainer struct {
	devEnvURL     string
	liveURL       string
	sessionTicket string
}

var Settings PlayFabSettings = PlayFabSettings{
	SdkVersion:      <%- sdkVersion %>,
	BuildIdentifier: "jbuild_gosdk_0",
	//VersionString:   nil,

	UseDevelopmentEnvironment: false,
	//DevelopmentEnvironmentURL: nil,
	//ProductionEnvironmentURL:  nil,
	//TitleID:                   nil, // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)

	// if ServerAPI || AdminAPI
	//DeveloperSecretKey: nil,

	// if ClientAPI
	//AdvertisingIDType:  nil, // Set this to the appropriate AD_TYPE_X constant below
	//AdvertisingIDValue: nil, // Set this to corresponding device value

	// disableAdvertising is provided for completeness, but changing it is not suggested
	// Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
	DisableAdvertising: false,
	//AD_TYPE_IDFA:       nil,
	//AD_TYPE_ANDROID_ID: nil,

	//serverURL: nil,
}

var internalSettings internalSettingsContainer = internalSettingsContainer{
	devEnvURL:     ".playfabsandbox.com",
	liveURL:       ".playfabapi.com",
	sessionTicket: "",
}

func GetServerUrl() string {
	baseUrl := internalSettings.liveURL
	if Settings.UseDevelopmentEnvironment {
		baseUrl = internalSettings.devEnvURL
	}
	return "https://" + Settings.TitleID + baseUrl
}

func readJSONFromResp(resp *http.Response) ([]byte, error) {
	b := make([]byte, 8)
	encodedJSON := make([]byte, 0)
	for {
		n, err := resp.Body.Read(b)
		encodedJSON = append(encodedJSON, b[:n]...)
		switch err {
		case io.EOF:
			return encodedJSON, nil
		case nil:
		default:
			return nil, err
		}
	}
}

func MakeRequest(urlStr string, request interface{}, authType string) ([]byte, error) {

	client := &http.Client{}

	marshaledJSON, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", GetServerUrl()+urlStr, strings.NewReader(string(marshaledJSON)))
	if err != nil {
		return nil, err
	}

	req.Header.Add("Content-Type", "application/json")
	//req.Header.Add("Content-Length", string(req.ContentLength)) unsure if this is needed and how to get the content length correctly
	req.Header.Add("X-PlayFabSDK", "GoSDK-"+Settings.SdkVersion+"-"+Settings.VersionString)
	req.Header.Add(authType, Settings.DeveloperSecretKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	encodedJSON, err := readJSONFromResp(resp)
	if err != nil {
		return nil, err
	}

	return encodedJSON, nil
}
