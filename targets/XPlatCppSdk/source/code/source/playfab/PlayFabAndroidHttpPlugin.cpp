#include <stdafx.h>

#include <jni.h>
#include <android/log.h>

#include <playfab/PlayFabAndroidHttpPlugin.h>
#include <playfab/PlayFabSettings.h>
#include <stdexcept>
#include <vector>

namespace PlayFab
{
    struct PlayFabAndroidHelper
    {
    public:
        PlayFabAndroidHelper() :
                jvm(nullptr),
                httpRequestClass(nullptr)
        {

        }

        virtual ~PlayFabAndroidHelper()
        {
            if (httpRequestClass)
            {
                JNIEnv* jniEnv;
                if(GetJniEnv(&jniEnv))
                {
                    jniEnv->DeleteGlobalRef(httpRequestClass);
                }
                httpRequestClass = nullptr;
            }
            this->jvm = nullptr;
        }

        bool Initialize(JavaVM* jvm)
        {
            assert(jvm);
            this->jvm = jvm;

            JNIEnv* jniEnv;
            this->jvm->GetEnv(reinterpret_cast<void**>(&jniEnv), JNI_VERSION_1_6);
            assert(jniEnv);
            if (jniEnv == nullptr)
            {
                return false;
            }

            jclass localClass = jniEnv->FindClass("com/microsoft/xplatcppsdk/HttpRequest");
            assert(localClass);
            if (localClass == nullptr)
            {
                return false;
            }

            httpRequestClass = reinterpret_cast<jclass>(jniEnv->NewGlobalRef(localClass));
            assert(httpRequestClass);

            jniEnv->DeleteLocalRef(localClass);

            if (httpRequestClass == nullptr)
            {
                return false;
            }

            return true;
        }

        bool GetJavaVM(JavaVM** jvm)
        {
            assert(this->jvm);
            if (this->jvm == nullptr)
            {
                assert(false);
                return false;
            }

            *jvm = this->jvm;

            return true;
        }

        bool GetJniEnv(JNIEnv** jniEnv)
        {
            assert(this->jvm);
            if (this->jvm == nullptr)
            {
                assert(false);
                return false;
            }

            jint result = this->jvm->GetEnv(reinterpret_cast<void**>(jniEnv), JNI_VERSION_1_6);

            if (result != JNI_OK)
            {
                assert(false);
                return false ;
            }

            return true;
        }

        jclass GetHttpRequestClass()
        {
            return httpRequestClass;
        }

    private:
        JavaVM* jvm;
        jclass httpRequestClass;
    };

}

static std::unique_ptr<PlayFab::PlayFabAndroidHelper> s_helper;

static PlayFab::PlayFabAndroidHelper& GetHelper()
{
    assert(s_helper);
    return *s_helper;
}

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved)
{
    __android_log_print(ANDROID_LOG_INFO, "XPlatCppSdk", "JNI_OnLoad");

    try
    {
        s_helper = std::make_unique<PlayFab::PlayFabAndroidHelper>();
    }
    catch (std::exception& e)
    {
        __android_log_print(ANDROID_LOG_INFO, "XPlatCppSdk", "Failed to create PlayFabAndroidHelper");
        throw e;
    }
    if (!(s_helper->Initialize(vm)))
    {
        throw "Initializing to load classes failed";
    }

    return JNI_VERSION_1_6;
}

JNIEXPORT void JNI_OnUnload(JavaVM* vm, void* reserved)
{
    __android_log_print(ANDROID_LOG_INFO, "XPlatCppSdk", "JNI_OnUnload");


    s_helper = nullptr;
}

namespace PlayFab
{
    struct PlayFabAndroidHttpPlugin::RequestImpl
    {
    public:
        RequestImpl() :
            jniEnv(nullptr),
            httpRequestObject(nullptr)
        {

        }

        virtual ~RequestImpl()
        {
            if (this->httpRequestObject)
            {
                assert(this->jniEnv);
                this->jniEnv->DeleteGlobalRef(this->httpRequestObject);
                this->httpRequestObject = nullptr;
            }
            this->jniEnv = nullptr;
        }

        void SetJniEnv(JNIEnv* jniEnv)
        {
            this->jniEnv = jniEnv;
        }

        JNIEnv* JniEvn()
        {
            assert(this->jniEnv);
            return this->jniEnv;
        }

        jobject GetHttpRequestObject()
        {
            if (this->httpRequestObject == nullptr)
            {
                assert(this->jniEnv);
                assert(GetHelper().GetHttpRequestClass());

                jmethodID initMethod = this->jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "<init>", "()V");
                assert(initMethod);
                if (initMethod == nullptr)
                {
                    return nullptr;
                }
                jobject localObject = this->jniEnv->NewObject(GetHelper().GetHttpRequestClass(), initMethod);
                assert(localObject);
                if (localObject == nullptr)
                {
                    return nullptr;
                }

                this->httpRequestObject = this->jniEnv->NewGlobalRef(localObject);
                assert(this->httpRequestObject);

                this->jniEnv->DeleteLocalRef(localObject);
            }
            return this->httpRequestObject;
        }

    private:
        JNIEnv* jniEnv;
        jobject httpRequestObject;

    };

}

namespace PlayFab
{
    PlayFabAndroidHttpPlugin::RequestTask::RequestTask() :
        state(RequestTask::None),
        impl(nullptr),
        requestContainer(nullptr)
    {

    }

    PlayFabAndroidHttpPlugin::RequestTask::~RequestTask()
    {
        if(impl)
        {
            delete impl;
            impl = nullptr;
        }
    }

    bool PlayFabAndroidHttpPlugin::RequestTask::Initialize(std::unique_ptr<CallRequestContainerBase>& requestContainer)
    {
        this->requestContainer = std::move(requestContainer);
        this->impl = new PlayFabAndroidHttpPlugin::RequestImpl();
        return true;
    }
}

namespace PlayFab
{
    PlayFabAndroidHttpPlugin::PlayFabAndroidHttpPlugin() :
        workerThread(nullptr),
        threadRunning(false),
        requestingTask(nullptr)
    {

    }

    PlayFabAndroidHttpPlugin::~PlayFabAndroidHttpPlugin()
    {
        threadRunning = false;

        httpRequestMutex.lock();

        if(workerThread)
        {
            httpRequestMutex.unlock();
            workerThread->join();
            httpRequestMutex.lock();
        }
        httpRequestMutex.unlock();
    }

    void PlayFabAndroidHttpPlugin::MakePostRequest(std::unique_ptr<CallRequestContainerBase> requestContainer)
    {
        std::shared_ptr<RequestTask> requestTask = nullptr;
        try
        {
            requestTask = std::make_shared<RequestTask>();
            requestTask->Initialize(requestContainer);
        }
        catch (const std::exception& ex)
        {
            PlayFabPluginManager::GetInstance().HandleException(ex);
        }
        catch (...)
        {

        }
        if(requestTask != nullptr)
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            requestTask->state = RequestTask::Pending;
            pendingRequests.push_back(std::move(requestTask));
            if(workerThread == nullptr)
            {
                threadRunning = true;
                workerThread = std::make_unique<std::thread>(&PlayFabAndroidHttpPlugin::WorkerThreadEntry, this);
            }
        } // UNLOCK httpRequestMutex
    }

    size_t PlayFabAndroidHttpPlugin::Update()
    {
        if (PlayFabSettings::threadedCallbacks)
        {
            throw std::runtime_error("You should not call Update() when PlayFabSettings::threadedCallbacks == true");
        }

        std::shared_ptr<RequestTask> requestTask = nullptr;
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            if (pendingResults.empty())
            {
                return pendingRequests.size();
            }

            requestTask = std::move(this->pendingResults[0]);
            this->pendingResults.pop_front();
        } // UNLOCK httpRequestMutex

        HandleResults(*requestTask);

        // activeRequestCount can be altered by HandleResults, so we have to re-lock and return an updated value
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            return pendingRequests.size() + pendingRequests.size();
        }
    }

    void PlayFabAndroidHttpPlugin::WorkerThreadEntry()
    {
        JavaVM* jvm;
        if(!GetHelper().GetJavaVM(&jvm))
        {
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            threadRunning = false;
            workerThread->detach();
            workerThread = nullptr;
            return ;
        }
        else
        {
            JNIEnv* jniEnv = nullptr;
            jvm->AttachCurrentThread(&jniEnv, nullptr);

            WorkerThread(static_cast<void*>(jniEnv));

            jvm->DetachCurrentThread();
        }
    }

    void PlayFabAndroidHttpPlugin::WorkerThread(void* jniEnv)
    {
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            this->requestingTask = nullptr;
        }
        while (threadRunning) {
            RequestTask::State state;
            { // LOCK httpRequestMutex
                std::unique_lock<std::mutex> lock(httpRequestMutex);
                if (this->requestingTask == nullptr) {
                    if (!pendingRequests.empty()) {
                        this->requestingTask = this->pendingRequests[0];
                        this->pendingRequests.pop_front();
                        this->requestingTask->impl->SetJniEnv(static_cast<JNIEnv*>(jniEnv));
                    } else {
                        threadRunning = false;
                        workerThread->detach();
                        workerThread = nullptr;
                        break;
                    }
                }
                state = this->requestingTask->state;
            } // UNLOCK httpRequestMutex
            switch (state) {
                case RequestTask::Pending: {
                    if (ExecuteRequest(*(this->requestingTask)))
                    {
                        this->requestingTask->state = RequestTask::Requesting;
                    }
                    else
                    {
                        SetResponceAsBadRequest(*(this->requestingTask));
                        this->requestingTask->state = RequestTask::Finished;
                    }
                    break;
                }
                case RequestTask::Requesting: {
                    if (CheckResponse(*(this->requestingTask)) == false)
                    {
                        SetResponceAsBadRequest(*(this->requestingTask));
                        this->requestingTask->state = RequestTask::Finished;
                    }
                    std::this_thread::yield();
                    break;
                }
                case RequestTask::Finished: {
                    if (PlayFabSettings::threadedCallbacks) {
                        HandleResults(*(this->requestingTask));
                    } else {
                        { // LOCK httpRequestMutex
                            std::unique_lock<std::mutex> lock(httpRequestMutex);
                            this->pendingResults.push_back(this->requestingTask);
                        } // UNLOCK httpRequestMutex
                    }
                    this->requestingTask = nullptr;
                    break;
                }
                default:
                    break;
            }
        }
    }

    bool PlayFabAndroidHttpPlugin::ExecuteRequest(RequestTask& requestTask)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();

        JNIEnv* jniEnv = requestTask.impl->JniEvn();
        assert(jniEnv);
        if (jniEnv == nullptr)
        {
            return false;
        }

        jobject httpRequestObject = requestTask.impl->GetHttpRequestObject();
        assert(httpRequestObject);
        if (httpRequestObject == nullptr)
        {
            return false;
        }

        // Call setMethod
        {
            jmethodID methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "setMethod", "(Ljava/lang/String;)V");
            assert(methodId);
            if (methodId == nullptr)
            {
                return false;
            }

            jstring urlJstr = jniEnv->NewStringUTF("POST");
            if (urlJstr == nullptr)
            {
                return false;
            }
            jniEnv->CallVoidMethod(httpRequestObject, methodId, urlJstr);
            jniEnv->DeleteLocalRef(urlJstr);
        }

        // Call SetUrl
        {
            auto requestUrl = GetUrl(requestTask);

            jmethodID methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "setUrl", "(Ljava/lang/String;)Z");
            assert(methodId);
            if (methodId == nullptr)
            {
                return false;
            }

            jstring urlJstr = jniEnv->NewStringUTF(requestUrl.c_str());
            if (urlJstr == nullptr)
            {
                return false;
            }
            jboolean result = jniEnv->CallBooleanMethod(httpRequestObject, methodId, urlJstr);
            jniEnv->DeleteLocalRef(urlJstr);
            if (result == JNI_FALSE)
            {
                return false;
            }
        }

        // Call SetPredefinedHeaders
        SetPredefinedHeaders(requestTask);

        // Call SetHeader
        auto headers = requestContainer.GetHeaders();
        if (!headers.empty())
        {
            for (auto const &obj : headers)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    SetHeader(requestTask, obj.first.c_str(), obj.second.c_str());
                }
            }
        }

        // Call SetBody
        {
            auto requestUrl = GetUrl(requestTask);

            jmethodID methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "setBody", "([B)V");
            assert(methodId);
            if (methodId == nullptr)
            {
                return false;
            }

            size_t payloadSize = 0;
            void* payload = nullptr;
            jbyteArray bodyArray = nullptr;

            if (!GetBinaryPayload(requestTask, payload, payloadSize))
            {
                // set string payload if binary wasn't provided
                std::string requestBody = requestContainer.GetRequestBody();
                payloadSize = (size_t)requestBody.size();

                if (payloadSize > 0)
                {
                    bodyArray = jniEnv->NewByteArray(static_cast<jsize>(payloadSize));
                    void *tempPrimitive = jniEnv->GetPrimitiveArrayCritical(bodyArray, 0);
                    memcpy(tempPrimitive, requestBody.c_str(), payloadSize);
                    jniEnv->ReleasePrimitiveArrayCritical(bodyArray, tempPrimitive, 0);
                }
            }
            else
            {
                if (payloadSize > 0)
                {
                    bodyArray = jniEnv->NewByteArray(static_cast<jsize>(payloadSize));
                    void *tempPrimitive = jniEnv->GetPrimitiveArrayCritical(bodyArray, 0);
                    memcpy(tempPrimitive, payload, payloadSize);
                    jniEnv->ReleasePrimitiveArrayCritical(bodyArray, tempPrimitive, 0);
                }
            }

            jniEnv->CallVoidMethod(httpRequestObject, methodId, bodyArray);
            if (bodyArray != nullptr)
            {
                jniEnv->DeleteLocalRef(bodyArray);
            }
        }

        // Call SendRequest
        {
            jmethodID methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "sendRequest", "()Z");
            assert(methodId);
            if (methodId == nullptr)
            {
                return false;
            }

            jboolean result = jniEnv->CallBooleanMethod(httpRequestObject, methodId);
            if(result == JNI_FALSE)
            {
                return false;
            }
        }

        return true;
    }

    bool PlayFabAndroidHttpPlugin::CheckResponse(RequestTask& requestTask)
    {
        CallRequestContainer& requestContainer = this->requestingTask->RequestContainer();

        JNIEnv* jniEnv = requestTask.impl->JniEvn();
        assert(jniEnv);
        if (jniEnv == nullptr)
        {
            return false;
        }

        jobject httpRequestObject = requestTask.impl->GetHttpRequestObject();
        assert(httpRequestObject);
        if (httpRequestObject == nullptr)
        {
            return false;
        }

        jmethodID methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "isRequestCompleted", "()Z");
        assert(methodId);
        if (methodId == nullptr)
        {
            return false;
        }

        jboolean result = jniEnv->CallBooleanMethod(httpRequestObject, methodId);
        if (result ==  JNI_TRUE)
        {
            jint httpCode = 0;
            {
                methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "getResponseHttpCode", "()I");
                assert(methodId);
                if (methodId)
                {
                    httpCode = jniEnv->CallIntMethod(httpRequestObject, methodId);
                }
            }
            {
                methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "getResponseHttpBody", "()[B");
                assert(methodId);
                if (methodId)
                {
                    auto responseBody = (jbyteArray)jniEnv->CallObjectMethod(httpRequestObject, methodId);

                    if (responseBody != nullptr)
                    {
                        int bodySize = jniEnv->GetArrayLength(responseBody);
                        if (bodySize > 0)
                        {
                            std::vector<uint8_t> bodyBuffer(static_cast<size_t>(bodySize));
                            jniEnv->GetByteArrayRegion(responseBody, 0, bodySize, reinterpret_cast<jbyte*>(bodyBuffer.data()));

                            std::string body(reinterpret_cast<const char* >(bodyBuffer.data()), bodyBuffer.size());
                            requestContainer.responseString = body;
                            ProcessResponse(*(this->requestingTask), static_cast<const int>(httpCode));
                        }

                        jniEnv->DeleteLocalRef(responseBody);
                    }
                }
            }

            { // LOCK httpRequestMutex
                std::unique_lock<std::mutex> lock(httpRequestMutex);
                requestTask.state = RequestTask::Finished;
            } // UNLOCK httpRequestMutex
        }

        return true;
    }

    void PlayFabAndroidHttpPlugin::SetResponceAsBadRequest(RequestTask& requestTask)
    {
        CallRequestContainer& requestContainer = this->requestingTask->RequestContainer();
        ProcessResponse(*(this->requestingTask), 400); // 400 Bad Request
    }


    std::string PlayFabAndroidHttpPlugin::GetUrl(RequestTask& requestTask) const
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();
        return PlayFabSettings::GetUrl(requestContainer.GetUrl(), PlayFabSettings::requestGetParams);
    }

    void PlayFabAndroidHttpPlugin::SetPredefinedHeaders(RequestTask& requestTask)
    {
        SetHeader(requestTask, "Accept", "application/json");
        SetHeader(requestTask, "Content-Type", "application/json; charset=utf-8");
        SetHeader(requestTask, "X-PlayFabSDK", std::string(PlayFabSettings::versionString.begin(), PlayFabSettings::versionString.end()).c_str());
        SetHeader(requestTask, "X-ReportErrorAsSuccess", "true");
    }

    void PlayFabAndroidHttpPlugin::SetHeader(RequestTask& requestTask, const char* name, const char* value)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();

        JNIEnv* jniEnv = requestTask.impl->JniEvn();
        assert(jniEnv);
        if (jniEnv == nullptr)
        {
            return ;
        }

        jobject httpRequestObject = requestTask.impl->GetHttpRequestObject();
        assert(httpRequestObject);
        if (httpRequestObject == nullptr)
        {
            return ;
        }

        jmethodID methodId = jniEnv->GetMethodID(GetHelper().GetHttpRequestClass(), "setHeader", "(Ljava/lang/String;Ljava/lang/String;)V");
        assert(methodId);
        if (methodId == nullptr)
        {
            return ;
        }

        jstring nameJstr = jniEnv->NewStringUTF(name);
        if (nameJstr == nullptr)
        {
            return ;
        }
        jstring valueJstr = jniEnv->NewStringUTF(value);
        if (valueJstr == nullptr)
        {
            jniEnv->DeleteLocalRef(nameJstr);
            return ;
        }

        jniEnv->CallVoidMethod(httpRequestObject, methodId, nameJstr, valueJstr);

        jniEnv->DeleteLocalRef(nameJstr);
        jniEnv->DeleteLocalRef(valueJstr);
    }

    bool PlayFabAndroidHttpPlugin::GetBinaryPayload(RequestTask& requestTask, void*& payload, size_t& payloadSize) const
    {
        return false;
    }

    void PlayFabAndroidHttpPlugin::ProcessResponse(RequestTask& requestTask, const int httpCode)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();
        Json::CharReaderBuilder jsonReaderFactory;
        std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
        JSONCPP_STRING jsonParseErrors;
        const bool parsedSuccessfully = jsonReader->parse(requestContainer.responseString.c_str(), requestContainer.responseString.c_str() + requestContainer.responseString.length(), &requestContainer.responseJson, &jsonParseErrors);

        if (parsedSuccessfully)
        {
            // fully successful response
            requestContainer.errorWrapper.HttpCode = requestContainer.responseJson.get("code", Json::Value::null).asInt();
            requestContainer.errorWrapper.HttpStatus = requestContainer.responseJson.get("status", Json::Value::null).asString();
            requestContainer.errorWrapper.Data = requestContainer.responseJson.get("data", Json::Value::null);
            requestContainer.errorWrapper.ErrorName = requestContainer.responseJson.get("error", Json::Value::null).asString();
            requestContainer.errorWrapper.ErrorCode = static_cast<PlayFabErrorCode>(requestContainer.responseJson.get("errorCode", Json::Value::null).asInt());
            requestContainer.errorWrapper.ErrorMessage = requestContainer.responseJson.get("errorMessage", Json::Value::null).asString();
            requestContainer.errorWrapper.ErrorDetails = requestContainer.responseJson.get("errorDetails", Json::Value::null);
        }
        else
        {
            requestContainer.errorWrapper.HttpCode = httpCode;
            requestContainer.errorWrapper.HttpStatus = requestContainer.responseString;
            requestContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
            requestContainer.errorWrapper.ErrorName = "Failed to parse PlayFab response";
            requestContainer.errorWrapper.ErrorMessage = jsonParseErrors;
        }
    }

    void PlayFabAndroidHttpPlugin::HandleResults(RequestTask& requestTask)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();

        auto callback = requestContainer.GetCallback();
        if (callback != nullptr)
        {
            callback(
                     requestContainer.responseJson.get("code", Json::Value::null).asInt(),
                     requestContainer.responseString,
                     std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(requestTask.requestContainer.release())));
        }
    }

}
