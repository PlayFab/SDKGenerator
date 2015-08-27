package playfab.internal;

import java.util.*;
import java.util.concurrent.*;
import java.net.*;
import java.io.*;
import com.google.gson.*;
import playfab.*;
import playfab.PlayFabErrors.*;

public class PlayFabHTTP {
	
	private static Gson gson = new GsonBuilder().setDateFormat("YYYY-MM-DD'T'hh:mm:ss.SSS'Z'").create();
	
	public static class PlayFabJsonError {
		public int Code;
		public String Status;
		public String Error;
		public int ErrorCode;
		public String ErrorMessage;
	   	public Map<String, String[]> ErrorDetails = null;
	}

	public static class PlayFabJsonSuccess<ResultT>{
	   	public int Code;
	   	public String Status;
	   	public ResultT Data;
	}
	
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
        con.setRequestProperty("X-PlayFabSDK", PlayFabVersion.getVersionString());
        con.setDoOutput(true);
        con.setDoInput(true);
        try {
        	OutputStreamWriter writer = new OutputStreamWriter(con.getOutputStream());
        	writer.write(bodyString);
        	writer.close();
				
        	String responseString = null;
        	try {
        		responseString = receive(con.getInputStream());
        	} catch(IOException e) {
        		responseString = receive(con.getErrorStream());
        	}
				
        	if(con.getResponseCode() != 200) {
        		PlayFabError error = new PlayFabError();
        		if(responseString == null || responseString.isEmpty() || con.getResponseCode() == 404 ) {
					error.HttpCode = con.getResponseCode();
					return error;
        		}
        		PlayFabErrors.PlayFabJsonError errorResult = null;
        		
        		try {
        			errorResult = gson.fromJson(responseString, PlayFabErrors.PlayFabJsonError.class);
        		} catch(Exception e) {
        			error.HttpCode = con.getResponseCode();
        			error.Error = PlayFabErrorCode.JsonParseError;
        			error.ErrorMessage = e.getLocalizedMessage();
        			return error;
        		}
        		
        		error.HttpCode = errorResult.code;
            	error.HttpStatus = errorResult.status;
            	error.Error = PlayFabErrorCode.getFromCode(errorResult.errorCode);
            	error.ErrorMessage = errorResult.errorMessage;
            	error.ErrorDetails = errorResult.errorDetails;
            	return error;
        		
        	}
        	
        	if(responseString == null || responseString.length() == 0) {
            	PlayFabError error = new PlayFabError();
            	error.Error = PlayFabErrorCode.Unknown;
            	error.ErrorMessage = "Internal server error";
            	return error;
            }

            return responseString;
        	
        } catch(Exception e) {
        	PlayFabError error = new PlayFabError();
        	error.Error = PlayFabErrorCode.ConnectionError;
        	error.ErrorMessage = e.getLocalizedMessage();
        	return error;
        }
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
    
}
