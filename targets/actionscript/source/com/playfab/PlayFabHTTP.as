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
	
	public class PlayFabHTTP
	{
		public static function post(url:String, requestBody:String, authType:String, authKey:String, onComplete:Function):void
		{
			var request:URLRequest = new URLRequest(url); 
			request.method = URLRequestMethod.POST;
			
			
			//Object data?
			if( requestBody != null ) {
				request.contentType = 'application/json';
				request.data = requestBody;
			}
			
			if(authType != null)
			{
				request.requestHeaders.push( new URLRequestHeader( authType, authKey ) );
			}
			
			request.requestHeaders.push( new URLRequestHeader( "X-PlayFabSDK", PlayFabVersion.getVersionString() ) );
			
			var status:int=0;
			
			var cleanup:Function = function():void
			{
				loader.removeEventListener( Event.COMPLETE, onComplete ); 
				loader.removeEventListener( IOErrorEvent.IO_ERROR, onError );
				loader.removeEventListener( SecurityErrorEvent.SECURITY_ERROR, onSecurityError );
				loader.removeEventListener( HTTPStatusEvent.HTTP_STATUS, onHttpStatus );
			}
			
			var onHttpStatus:Function = function(event:HTTPStatusEvent):void
			{
				status = event.status;
			}
			
			var onSuccess:Function = function(event:Event):void
			{
				cleanup();
				var jsonReply:String = loader.data as String;
				var replyEnvelope:Object = JSON.parse(jsonReply);
				var replyData:Object = replyEnvelope.data;
				if(status == 200)
				{
					onComplete(replyData, null);
				}
				else
				{
					var error:PlayFabError = new PlayFabError(replyData);
					onComplete(null, error);
				}
			}
				
			var onError:Function = function(event:IOErrorEvent):void
			{
				cleanup();
				
				var message:String = event.toString(); // Default to the IOError
				if (event.currentTarget != null)
				{
					message = event.currentTarget.data; // But, when possible try to display the actual error returned from the PlayFab server
				}
				
				var error:PlayFabError = new PlayFabError({
					Error: PlayFabError.NetworkIOError,
					ErrorMessage: message
				});
				onComplete(null, error);
			}
				
			var onSecurityError:Function = function(event:SecurityErrorEvent):void
			{
				cleanup();
				var error:PlayFabError = new PlayFabError({
					Error: PlayFabError.FlashSecurityError,
					ErrorMessage: event.toString()
				});
				onComplete(null, event.toString());
			}
			
			var loader:URLLoader = new URLLoader();
			loader.addEventListener( Event.COMPLETE, onSuccess ); 
			loader.addEventListener( IOErrorEvent.IO_ERROR, onError );
			loader.addEventListener( SecurityErrorEvent.SECURITY_ERROR, onSecurityError );
			loader.addEventListener( HTTPStatusEvent.HTTP_STATUS, onHttpStatus );
			
			loader.load( request );
		}
	}
}