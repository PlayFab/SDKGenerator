package com.playfab.internal;

import java.util.*;
import java.util.concurrent.*;
import java.net.*;
import java.io.*;
import com.google.gson.*;

import com.playfab.PlayFabSettings;
import com.playfab.PlayFabErrors.PlayFabError;
import com.playfab.PlayFabErrors.PlayFabErrorCode;
import com.playfab.PlayFabErrors.PlayFabJsonError;
import com.playfab.PlayFabErrors.PlayFabJsonSuccess;

public class PlayFabHTTP {
    private static Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").create();

    public static FutureTask<Object> doPost(final String url, final Object request, final String authType, final String authKey) {
        return new FutureTask<Object>(new Callable<Object>() {
            public Object call() throws Exception {
                return doPostPrivate(url, request, authType, authKey);
            }
        });
    }

    private static Object doPostPrivate(String url, Object request, String authType, String authKey) throws Exception {
        String bodyString = null;

        if(request == null) {
            bodyString = "{}";
        }
        else if (request instanceof String) {
            bodyString = (String)request;
        }
        else {
            bodyString = gson.toJson(request);
        }

        // System.out.println("Sending: " + bodyString);

        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json");
        if(authType != null) {
            con.setRequestProperty(authType, authKey);
        }
        con.setRequestProperty("X-PlayFabSDK", PlayFabSettings.SdkVersionString);
        con.setDoOutput(true);
        con.setDoInput(true);

        // Make the API-Call and get the normal response httpCode
        int httpCode = 503; // default to SERVICE_UNAVAILABLE
        try {
            OutputStreamWriter writer = new OutputStreamWriter(con.getOutputStream());
            writer.write(bodyString);
            writer.close();
            httpCode = con.getResponseCode();
        } catch(Exception e) {
            return GeneratePfError(httpCode, PlayFabErrorCode.ServiceUnavailable, "Failed to post to server: " + url, null);
        }

        // Get the response string
        String responseString = null;
        try {
            responseString = receive(con.getInputStream());
        } catch(IOException e) {
            responseString = receive(con.getErrorStream());
        }

        // Check for normal error results
        if(httpCode != 200 || responseString == null || responseString.isEmpty()) {
            if(responseString == null || responseString.isEmpty() || httpCode == 404 )
                return GeneratePfError(httpCode, PlayFabErrorCode.ServiceUnavailable, "Empty server response", null);

            PlayFabJsonError errorResult = null;
            try {
                errorResult = gson.fromJson(responseString, PlayFabJsonError.class);
            } catch(Exception e) {
                return GeneratePfError(httpCode, PlayFabErrorCode.JsonParseError, "Server response not proper json :" + responseString, null);
            }

            httpCode = errorResult.code;
            return GeneratePfError(httpCode, PlayFabErrorCode.getFromCode(errorResult.errorCode), errorResult.errorMessage, errorResult.errorDetails);
        }

        return responseString;
    }

    public static String receive(InputStream in) throws IOException {
        StringBuilder recieved = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(in));

        String line = null;
        while ((line = reader.readLine()) != null) {
            recieved.append(line);
            recieved.append('\n');
        }

        return recieved.toString();
    }

    public static PlayFabError GeneratePfError(int httpCode, PlayFabErrorCode pfErrorCode, String errorMessage, Map<String, List<String>> errorDetails) {
        PlayFabError output =  new PlayFabError();

        output.httpCode = httpCode;
        output.httpStatus = "" + httpCode; // TODO: Convert this to the right string-name
        output.pfErrorCode = pfErrorCode;
        output.errorMessage = errorMessage;
        output.errorDetails = errorDetails;

        return output;
    }
}
