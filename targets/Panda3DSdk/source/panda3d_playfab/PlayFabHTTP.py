from direct.directnotify.DirectNotifyGlobal import directNotify  

import traceback
import json

import panda3d_playfab.PlayFabSettings as PlayFabSettings
import panda3d_playfab.PlayFabErrors as PlayFabErrors

from panda3d.core import HTTPClient, HTTPChannel, DocumentSpec
from panda3d.core import Ramfile, UniqueIdAllocator, ConfigVariableInt

PlayFabNotify = directNotify.newCategory('playfab')

class PlayFabRequest(object):
    """
    Represents a Playfab HTTP request currently in queue
    """

    def __init__(self, rest, requestId, channel, ram_file, callback=None):
        self._rest = rest
        self._requestId = requestId
        self._channel = channel
        self._callback = callback
        self._ramFile = ram_file
    
    @property
    def requestId(self):
        return self._requestId

    @property
    def channel(self):
        return self._channel

    @property
    def ram_file(self):
        return self._ram_file

    def update(self):
        """
        Performs the run operations and finishing callbacks
        for the request's channel instance
        """

        if self._channel == None:
            return

        done = not self._channel.run()
        if done:
            PlayFabNotify.debug('Completed request: %s' % self._requestId)
            
            if self._callback != None:
                try:
                    self._callback(self._ramFile.get_data())
                except Exception as e:
                    PlayFabSettings.GlobalExceptionLogger(e) 

            self._rest.RemoveRequest(self._requestId)

class PlayFabHTTPQueue(object):
    """
    Static class for handling Playfab API requests with Panda's HTTPClient object 
    """

    def __init__(self):
        self.__httpClient = HTTPClient()

        MaxHTTPRequests = ConfigVariableInt('playfab-max-requests', 900).value
        self.__requestAllocator = UniqueIdAllocator(0, MaxHTTPRequests)
        self.__pollTask = None
        self.__requests = {}

    def Initialize(self):
        """
        Performs setup operations on the PlayFabHTTP singleton
        """

        self.__pollTask = taskMgr.add(
            self.__UpdateRequests, 
            '%s-update-task' % self.__class__.__name__)

    def __UpdateRequests(self, task):
        """
        Performs update operations on the PlayFabHTTP singleton
        """

        for requestId in list(self.__requests):

            # Check that this id is still valid
            if requestId not in self.__requests:
                continue

            request = self.__requests[requestId]
            request.update()

        return task.cont

    def Destroy(self):
        """
        Performs destruction operations on the PandaHTTP instance
        """
    
        if self.__pollTask:
            taskMgr.remove(self.__pollTask)

        for requestId in list(self.__requests):
            self.RemoveRequest(requestId)

    def RemoveRequest(self, requestId):
        """
        Removes the request id form the PandaHTTP request list
        """
        
        if requestId not in self.__requests:
            return

        self.__requestAllocator.free(requestId)
        del self.__requests[requestId]

    def GetRequestStatus(self, requestId):
        """
        Returns the requests current status
        """

        return not requestId in self.__requests

    def GetRequest(self, requestId):
        """
        Returns the requested request if its present
        """

        return self.__requests.get(requestId, None) 

    def PerformPostRequest(self, url, headers={}, contentType=None, postBody={}, callback=None):
        """
        """

        PlayFabNotify.debug('Sending POST request: %s' % url)

        requestChannel = self.__httpClient.make_channel(True)
        if contentType != None:
            requestChannel.set_content_type(contentType)

        for headerKey in headers:
            headerValue = headers[headerKey]
            requestChannel.send_extra_header(headerKey, headerValue)

        requestChannel.begin_post_form(DocumentSpec(url), postBody)

        ramFile = Ramfile()
        requestChannel.download_to_ram(ramFile, False)

        requestId = self.__requestAllocator.allocate()
        httpRequest = PlayFabRequest(self, requestId, requestChannel, ramFile, callback)
        self.__requests[requestId] = httpRequest

        return requestId

HTTPQueue = PlayFabHTTPQueue()

def DoPost(urlPath, request, authKey, authVal, callback, customData = None, extraHeaders = None):
    """
    Note this is a blocking call and will always run synchronously
    the return type is a dictionary that should contain a valid dictionary that
    should reflect the expected JSON response
    if the call fails, there will be a returned PlayFabError
    """

    url = PlayFabSettings.GetURL(urlPath, PlayFabSettings._internalSettings.RequestGetParams)

    try:
        j = json.dumps(request)
    except Exception as e:
        raise PlayFabErrors.PlayFabException("The given request is not json serializable. {}".format(e))

    requestHeaders = {}

    if extraHeaders:
        requestHeaders.update(extraHeaders)

    requestHeaders["Content-Type"] = "application/json"
    requestHeaders["X-PlayFabSDK"] = PlayFabSettings._internalSettings.SdkVersionString
    requestHeaders["X-ReportErrorAsSuccess"] = "true" # Makes processing PlayFab errors a little easier

    if authKey and authVal:
        requestHeaders[authKey] = authVal

    def PlayFabWrapper(data):
        """
        """

        error = response = None
        data = json.loads(data.decode('utf-8'))
        if data["code"] != 200:
            # Contacted PlayFab, but response indicated failure
            error = data 
        else:
            # Successful call to PlayFab
            response = data["data"]

        if error and callback:
            callGlobalErrorHandler(error)

            try:
                # Notify the caller about an API Call failure
                callback(None, error) 
            except Exception as e:
                # Global notification about exception in caller's callback
                PlayFabSettings.GlobalExceptionLogger(e) 
        elif (response or response == {}) and callback:
            try:
                # Notify the caller about an API Call success
                # User should also check for {} on the response as it can still be a valid call
                callback(response, None) 
            except Exception as e:
                # Global notification about exception in caller's callback
                PlayFabSettings.GlobalExceptionLogger(e) 
        elif callback:
            try:
                # Notify the caller about an API issue, response was none
                emptyResponseError = PlayFabErrors.PlayFabError()
                emptyResponseError.Error = "Empty Response Recieved"
                emptyResponseError.ErrorMessage = "PlayFabHTTP Recieved an empty response"
                emptyResponseError.ErrorCode = PlayFabErrors.PlayFabErrorCode.Unknown
                callback(None, emptyResponseError)
            except Exception as e:
                # Global notification about exception in caller's callback
                PlayFabSettings.GlobalExceptionLogger(e) 

    requestId = HTTPQueue.PerformPostRequest(
        url=url, 
        headers=requestHeaders, 
        contentType="application/json",
        postBody=j,
        callback=PlayFabWrapper)

    return requestId

def callGlobalErrorHandler(error):
    if PlayFabSettings.GlobalErrorHandler:
        try: 
            # Global notification about an API Call failure
            PlayFabSettings.GlobalErrorHandler(error)
        except Exception as e:
            # Global notification about exception in caller's callback
            PlayFabSettings.GlobalExceptionLogger(e) 
