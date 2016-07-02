using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Events;
using PlayFab;
using PlayFab.ClientModels;
using System.Collections.Generic;

public class ScreenOutput : MonoBehaviour
{
    // link to our other scene object.
    public PlayFabManager pf_manager;

    // other UI elements
    public Text LoginResponse;
    public Button testCloudScript;
    public Text cloudScriptResponse;

    // Use this for initialization
    void Start()
    {
        testCloudScript.onClick.RemoveAllListeners();
        testCloudScript.onClick.AddListener(() => { TestCloudScript(); });
    }

    // Update is called once per frame
    void Update()
    {
        if (pf_manager != null && !string.Equals(LoginResponse.text, pf_manager.callStatus))
        {
            LoginResponse.text = pf_manager.callStatus;
            EnableTestCSButton();
        }
    }

    /// <summary>
    /// Enables the test CS button.
    /// </summary>
    void EnableTestCSButton()
    {
        // check to see if our player is authenticated
        if (testCloudScript.interactable == false && PlayFabClientAPI.IsClientLoggedIn())
        {
            testCloudScript.interactable = true;
        }
    }

    // An example of how to access Cloud Script methods.
    void TestCloudScript()
    {
        ExecuteCloudScriptRequest request = new ExecuteCloudScriptRequest();
        request.FunctionName = "helloWorld";

        PlayFabClientAPI.ExecuteCloudScript(request, (ExecuteCloudScriptResult result) =>
        {
            // we are expecting a string,string keyvaluepair, so here we are capturing the kvp with a dictionary due to it being easier to work with.
            Dictionary<string, string> deserializedResults = result.FunctionResult as Dictionary<string, string>;

            string message = string.Empty;
            if (deserializedResults.TryGetValue("messageValue", out message))
            {
                cloudScriptResponse.text = string.Format("Cloud Script -- Revision: {1} \nResponse: {2}", result.Revision, message);
            }
            else
            {
                cloudScriptResponse.text = "Cloud Script call was successful, but there was an error deserializing the messageValue";
            }
        }, OnPlayFabError);
    }

    // A standard error callback that prints out any errors to the screen and to the console.
    void OnPlayFabError(PlayFabError error)
    {
        string message = string.Format("Error {0}: {1}", error.HttpCode, error.ErrorMessage);
        this.cloudScriptResponse.text = message;
        Debug.Log(message);
    }
}
