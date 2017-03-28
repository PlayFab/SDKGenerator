import static org.junit.Assert.*;
import org.junit.*;

import java.util.*;
import java.io.*;
import java.util.Properties;

import com.google.gson.*;
import com.google.gson.reflect.*;

import com.playfab.PlayFabErrors.*;
import com.playfab.PlayFabSettings;
import com.playfab.PlayFabServerModels;
import com.playfab.PlayFabServerAPI;

public class PlayFabApiTest
{
    // Cached values
    private static String playFabId = "1337D00D"; // This is not a valid player id, but Cloud Script doesn't care unless that id is used by the Cloud Script handler.

    // Helpers
    private <RT> void VerifyResult(PlayFabResult<RT> result, boolean expectSuccess)
    {
        assertNotNull(result);
        String errorMessage = CompileErrorsFromResult(result);
        if (expectSuccess)
        {
            assertNull(errorMessage, result.Error);
            assertNotNull(errorMessage, result.Result);
        }
        else
        {
            assertNull(errorMessage, result.Result);
            assertNotNull(errorMessage, result.Error);
        }
    }

    private <RT> String CompileErrorsFromResult(PlayFabResult<RT> result)
    {
        if (result == null || result.Error == null)
            return null;

        String errorMessage = "";
        if (result.Error.errorMessage != null)
            errorMessage += result.Error.errorMessage;
        if (result.Error.errorDetails != null)
            for (Map.Entry<String, List<String>> pair : result.Error.errorDetails.entrySet() )
                for (String msg : pair.getValue())
                    errorMessage += "\n" + pair.getKey() + ": " + msg;
        return errorMessage;
    }

    private class TitleData
    {
        public String titleId;
        public String developerSecretKey;
    }

    @BeforeClass
    public static void oneTimeSetUp() {
        Map<String, String> env = System.getenv();
        String testTitleDataFile = env.get("PF_TEST_TITLE_DATA_JSON"); // Set the PF_TEST_TITLE_DATA_JSON env-var to the path of a testTitleData.json file (described here: https://github.com/PlayFab/SDKGenerator/blob/master/JenkinsConsoleUtility/testTitleData.md)
        String testTitleJson;
        try {
            File file = new File(testTitleDataFile);
            FileInputStream fis = new FileInputStream(file);
            byte[] data = new byte[(int) file.length()];
            fis.read(data);
            fis.close();
            testTitleJson = new String(data);
        } catch (IOException e) {
            // NOTE: Un-Comment and put your title-specific information here to test your title, or use PF_TEST_TITLE_DATA_JSON above
            //PlayFabSettings.TitleId = "TODO: TitleID";
            //PlayFabSettings.DeveloperSecretKey = "TODO: A big long secret key that you should NEVER publish with your server";
            return;
        }
        Gson gson = new GsonBuilder().create();
        TitleData resultData = gson.fromJson(testTitleJson, new TypeToken<TitleData>(){}.getType());
        PlayFabSettings.TitleId = resultData.titleId;
        PlayFabSettings.DeveloperSecretKey = resultData.developerSecretKey;
    }

    /// <summary>
    /// SERVER API
    /// Test that CloudScript can be properly set up and invoked
    /// </summary>
    @Test
    public void CloudScript()
    {
        PlayFabServerModels.ExecuteCloudScriptServerRequest hwRequest = new PlayFabServerModels.ExecuteCloudScriptServerRequest();
        hwRequest.FunctionName = "helloWorld";
        hwRequest.PlayFabId = playFabId;
        PlayFabResult<PlayFabServerModels.ExecuteCloudScriptResult> hwResult = PlayFabServerAPI.ExecuteCloudScript(hwRequest);
        VerifyResult(hwResult, true);
        assertNotNull(hwResult.Result.FunctionResult);
        Map<String, String> arbitraryResults = (Map<String, String>)hwResult.Result.FunctionResult;
        assertEquals(arbitraryResults.get("messageValue"), "Hello " + playFabId + "!");
    }

    /// <summary>
    /// SERVER API
    /// Test that CloudScript errors can be deciphered
    /// </summary>
    @Test
    public void CloudScriptError()
    {
        PlayFabServerModels.ExecuteCloudScriptServerRequest errRequest = new PlayFabServerModels.ExecuteCloudScriptServerRequest();
        errRequest.FunctionName = "throwError";
        errRequest.PlayFabId = playFabId;
        PlayFabResult<PlayFabServerModels.ExecuteCloudScriptResult> errResult = PlayFabServerAPI.ExecuteCloudScript(errRequest);
        VerifyResult(errResult, true);
        assertTrue(errResult.Result.FunctionResult == null);
        assertNotNull(errResult.Result.Error);
        assertEquals(errResult.Result.Error.Error, "JavascriptException");
    }
}

