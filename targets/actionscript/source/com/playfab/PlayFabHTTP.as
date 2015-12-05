package com.playfab
{
    import flash.events.Event;
    import flash.events.HTTPStatusEvent;
    import flash.events.IOErrorEvent;
    import flash.events.SecurityErrorEvent;
    import flash.net.URLLoader;
    import flash.net.URLRequest;
    import flash.net.URLRequestHeader;
    import flash.net.URLRequestMethod;
    import flash.utils.getQualifiedClassName;

    public class PlayFabHTTP
    {
        public static function post(url:String, requestBody:String, authType:String, authKey:String, onComplete:Function):void
        {
            var request:URLRequest = new URLRequest(url);
            request.method = URLRequestMethod.POST;

            //Object data?
            if( requestBody != null ) {
                request.contentType = "application/json";
                request.data = requestBody;
            }

            if(authType != null) request.requestHeaders.push( new URLRequestHeader( authType, authKey ) );
            request.requestHeaders.push( new URLRequestHeader( "X-PlayFabSDK", PlayFabVersion.getVersionString() ) );

            var gotHttpStatus:int=0;

            var cleanup:Function = function():void
            {
                loader.removeEventListener( HTTPStatusEvent.HTTP_STATUS, onHttpStatus );
                loader.removeEventListener( Event.COMPLETE, onSuccess );
                loader.removeEventListener( IOErrorEvent.IO_ERROR, onError );
                loader.removeEventListener( SecurityErrorEvent.SECURITY_ERROR, onSecurityError );
            }

            var onHttpStatus:Function = function(event:HTTPStatusEvent):void
            {
                gotHttpStatus = event.status;
            }

            var onSuccess:Function = function(event:Event):void
            {
                cleanup();
                var replyEnvelope:Object = JSON.parse(loader.data);
                if(gotHttpStatus == 200)
                    onComplete(replyEnvelope.data, null);
                else
                    onComplete(null, new PlayFabError(replyEnvelope.data));
            }

            var onError:Function = function(event:IOErrorEvent):void
            {
                cleanup();

                var error:PlayFabError;
                if (event.currentTarget != null)
                {
                    try // When possible try to display the actual error returned from the PlayFab server
                    {
                        var replyEnvelope:Object = JSON.parse(event.currentTarget.data);
                        error = new PlayFabError(replyEnvelope);
                    }
                    catch (e:Error)
                    {
                        error = new PlayFabError({
                            httpCode: "HTTP ERROR:" + gotHttpStatus,
                            httpStatus: gotHttpStatus,
                            error: "NetworkIOError",
                            errorCode: PlayFabError.NetworkIOError,
                            errorMessage: event.toString() // Default to the IOError
                        });
                    }
                }
                else
                {
                    error = new PlayFabError({
                        httpCode: "HTTP ERROR:" + gotHttpStatus,
                        httpStatus: gotHttpStatus,
                        error: "NetworkIOError",
                        errorCode: PlayFabError.NetworkIOError,
                        errorMessage: event.toString() // Default to the IOError
                    });
                }

                onComplete(null, error);
            }

            var onSecurityError:Function = function(event:SecurityErrorEvent):void
            {
                cleanup();
                var error:PlayFabError = new PlayFabError({
                    httpCode: "HTTP ERROR:" + gotHttpStatus,
                    httpStatus: gotHttpStatus,
                    error: "FlashSecurityError",
                    errorCode: PlayFabError.FlashSecurityError,
                    errorMessage: event.toString()
                });
                onComplete(null, error);
            }

            var loader:URLLoader = new URLLoader();
            loader.addEventListener( HTTPStatusEvent.HTTP_STATUS, onHttpStatus );
            loader.addEventListener( Event.COMPLETE, onSuccess );
            loader.addEventListener( IOErrorEvent.IO_ERROR, onError );
            loader.addEventListener( SecurityErrorEvent.SECURITY_ERROR, onSecurityError );

            loader.load( request );
        }
    }
}
