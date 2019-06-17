package com.playfab.xplatcppsdk;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import android.util.Log;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.RequestBody;

public class HttpRequest {
    private static OkHttpClient httpClient;

    private Request.Builder requestBuilder;
    private MediaType contentType;
    private boolean requestCompleted = false;
    private Response response;
    private String method = "POST";

    static {
        httpClient = new OkHttpClient.Builder()
                .retryOnConnectionFailure(false) // Explicitly disable retries;
                .connectTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build();
    }

    public HttpRequest() {
        this.requestBuilder = new Request.Builder();
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public boolean setUrl(String url) {
        try
        {
            this.requestBuilder = this.requestBuilder.url(url);
        }
        catch (Exception e)
        {
            return false;
        }
        return true;
    }

    public void setHeader(String name, String value) {
        try
        {
            if(name.equalsIgnoreCase("Content-Type"))
            {
                this.contentType = MediaType.parse(value);
            }
            else
            {
                this.requestBuilder = requestBuilder.addHeader(name, value);
            }
        }
        catch (Exception e)
        {

        }
    }

    public void setBody(byte[] body) {
        try
        {
            this.requestBuilder = this.requestBuilder.method(this.method, RequestBody.create(this.contentType, body));
        }
        catch (Exception e)
        {

        }
    }

    public boolean isRequestCompleted() {
        return this.requestCompleted;
    }

    public boolean sendRequest() {
        try
        {
            this.requestCompleted = false;
            this.httpClient.newCall(this.requestBuilder.build()).enqueue(new Callback() {
                @Override
                public void onFailure(final Call call, IOException e) {
                    onRequestFailed(e.getClass().getCanonicalName());
                }

                @Override
                public void onResponse(Call call, final Response response) throws IOException {
                    onRequestCompleted(response);
                }
            });
        }
        catch (Exception e)
        {
            return false;
        }
        return true;
    }

    public void onRequestFailed(String errorMessage) {
        this.requestCompleted = true;
    }

    public void onRequestCompleted(Response httpresponse) {
        this.requestCompleted = true;
        this.response = httpresponse;
    }

    public int getResponseHttpCode()
    {
        if (this.response != null && this.requestCompleted) {
            return this.response.code();
        } else {
            return 400; // Bad request
        }
    }

    public byte[] getResponseHttpBody()
    {
        if (this.response != null && this.requestCompleted) {
            try {
                return this.response.body().bytes();
            } catch (IOException e) {
                Log.e("PlayFab","exception", e);
            }
        }

        return null;
    }
}


