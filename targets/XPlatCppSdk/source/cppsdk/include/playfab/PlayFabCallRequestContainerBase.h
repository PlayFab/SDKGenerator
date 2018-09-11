#pragma once

#include <unordered_map>

namespace PlayFab
{
    typedef std::shared_ptr<void> SharedVoidPointer;

    //typedef std::function<void(int, std::string, void* customContext = nullptr)> CallRequestContainerCallback;
    typedef void(*CallRequestContainerCallback)(int, std::string, void* customContext);

    /// <summary>
    /// A Container meant for holding everything necessary to make a full HTTP request and respond appropriatley
    /// A user is expected to inherit from this if they are to make their own Http plugin.
    /// </summary>
    class CallRequestContainerBase
    {
    public:
        
        /// url is the relative url to the API a user wishes to call
        /// headers should contain any optional headers that may be associated with this same API call
        /// requestBody is the actual Json object as a string
        /// CallRequestContainerCallback is an internal callback that will handle the logic of calling an error callback or success
        /// externalCallback is the user's callback that they hand to us.
        /// PlayFabError contains the error callback.
        /// customContext can be any object a user expects to be associated with this particular transaction (id/hash etc.)
        CallRequestContainerBase(
            std::string url,
            const std::unordered_map<std::string, std::string>& headers,
            std::string requestBody,
            CallRequestContainerCallback callback,
            SharedVoidPointer externalCallback = nullptr,
            ErrorCallback errorCallback = nullptr, 
            void* customContext = nullptr);

        CallRequestContainerBase(const CallRequestContainerBase& rCrc);
        const CallRequestContainerBase& operator=(const CallRequestContainerBase& rCrc);

        virtual ~CallRequestContainerBase();

        std::string getUrl() const;
        std::unordered_map<std::string, std::string> getHeaders() const;
        std::string getRequestBody() const;

        /// <summary>
        /// This function is meant to handle logic of calling the error callback or success
        /// </summary>
        CallRequestContainerCallback getCallback() const;

        /// <summary>
        /// If the HTTP call fails, this function is called.
        /// The user's other function will not be called.
        /// </summary>
        ErrorCallback getErrorCallback() const;

        /// <summary>
        /// returns a user specific callback (like an OnLogInWithCustomId)
        /// </summary>
        SharedVoidPointer* getAPICallback();

        void* getCustomContext() const;

    private:
        std::string mUrl;
        std::unordered_map<std::string, std::string> mHeaders;
        std::string mRequestBody;
        CallRequestContainerCallback mCallback;

        ErrorCallback mErrorCallback;
        //std::function<void(CallRequestContainerBase&)> internalCallback; // this is an old version of the callback that we did internally. This should no longer be needed as it has been refactored to take different parameters
        SharedVoidPointer mSuccessCallback;

        void* mCustomContext;
    };
}
