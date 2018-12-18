//------------------------------------------------------------------------------
// HttpRequest.cpp
//
// An example use of IXMLHTTPRequest2Callback
//
// Advanced Technology Group (ATG)
// Copyright (C) Microsoft Corporation. All rights reserved.
//------------------------------------------------------------------------------
//
// *** (RP) Removed unused logic from original sample app code

#include <stdafx.h>

#include <playfab/PlayFabIXHR2HttpRequest.h>
#include <string>
#include <sstream>

using namespace Windows::Foundation;

using namespace PlayFab;
using namespace Microsoft::WRL;
// using namespace Windows::Xbox::System;

// Max HTTP request size is 4MB
static const int MAX_HTTP_BUFFER_SIZE = 4 * 1048576;

// Read incominmg streams in chunks of 8K
static const int DEFAULT_HTTP_CHUNK_SIZE = 8192;

// --------------------------------------------------------------------------------------
// Name: HttpCallback::~HttpCallback
// Desc: Destructor
// --------------------------------------------------------------------------------------
HttpCallback::~HttpCallback()
{
    // remove the completion EVENT object.
    if (m_hComplete)
    {
        ::CloseHandle(m_hComplete);
    }
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::RuntimeClassInitialize
// Desc: Used by WRL to instance the COM object
// --------------------------------------------------------------------------------------
STDMETHODIMP HttpCallback::RuntimeClassInitialize()
{
    // Create the "complete" event
    HANDLE hEvent = ::CreateEventEx(nullptr,                     // security attributes
        nullptr,                     // name of the event
        CREATE_EVENT_MANUAL_RESET,   // flags (starts nonsignaled, manual ResetEvent())
        EVENT_ALL_ACCESS);          // desired access
    if (hEvent == nullptr)
    {
        return HRESULT_FROM_WIN32(GetLastError());
    }

    m_hComplete = hEvent;

    return S_OK;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::OnRedirect
//
// Desc: The requested URI was redirected by the HTTP server to a new URI.
//
// Arguments:
//     pXHR         - The interface pointer of originating IXMLHTTPRequest2 object.
//     pRedirectUrl - The new URL to for the request.
// --------------------------------------------------------------------------------------
IFACEMETHODIMP HttpCallback::OnRedirect(IXMLHTTPRequest2* pXHR, const wchar_t* pRedirectUrl)
{
    UNREFERENCED_PARAMETER(pXHR);
    UNREFERENCED_PARAMETER(pRedirectUrl);

    return S_OK;
};

// --------------------------------------------------------------------------------------
// Name: HttpCallback::OnHeadersAvailable
//
// Desc: The HTTP Headers have been downloaded and are ready for parsing. The string that is
//       returned is owned by this function and should be copied or deleted before exit.
//
// Arguments:
//     pXHR       - The interface pointer of originating IXMLHTTPRequest2 object.
//     dwStatus   - The value of HTTP status code, e.g. 200, 404
//     pwszStatus - The description text of HTTP status code.
// --------------------------------------------------------------------------------------
IFACEMETHODIMP HttpCallback::OnHeadersAvailable(IXMLHTTPRequest2 *pXHR, DWORD dwStatus, const wchar_t *pwszStatus)
{
    UNREFERENCED_PARAMETER(pwszStatus);
    HRESULT hr = S_OK;

    // We need a pointer to the originating HttpRequest object, otherwise this
    // makes no sense.
    if (pXHR == NULL)
    {
        return E_INVALIDARG;
    }

    // Get all response headers. We could equally select a single header using:
    //
    //     hr = pXHR->GetResponseHeader(L"Content-Length", &pwszContentLength);
    //
    wchar_t* headers = nullptr;
    hr = pXHR->GetAllResponseHeaders(&headers);
    if (SUCCEEDED(hr))
    {
        // take a copy of the header data to the local wstring.
        m_headers += headers;
        hr = S_OK;
    }

    // The header string that was passed in needs to be deleted here.
    if (headers != nullptr)
    {
        ::CoTaskMemFree(headers);
        headers = nullptr;
    }

    // copy the http status for later use.
    m_httpStatus = dwStatus;

    return hr;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::OnDataAvailable
//
// Desc: Part of the HTTP Data payload is available, we can start processing it
//       here or copy it off and wait for the whole request to finish loading.
//
// Arguments:
//    pXHR            - Pointer to the originating IXMLHTTPRequest2 object.
//    pResponseStream - Pointer to the input stream, which may only be part of the
//                      whole stream.
// --------------------------------------------------------------------------------------
IFACEMETHODIMP HttpCallback::OnDataAvailable(IXMLHTTPRequest2 *pXHR, ISequentialStream *pResponseStream)
{
    UNREFERENCED_PARAMETER(pXHR);

    // add the contents of the stream to our running result.
    m_hr = ReadDataFromStream(pResponseStream);

    return m_hr;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::OnResponseReceived
//
// Desc: Called when the entire body has been received.
//       At this point the application can begin processing the data by calling
//       ISequentialStream::Read on the pResponseStream or store a reference to
//       the ISequentialStream for later processing.
//
// Arguments:
//    pXHR            - Pointer to the originating IXMLHTTPRequest2 object.
//    pResponseStream - Pointer to the complete input stream.
// --------------------------------------------------------------------------------------
IFACEMETHODIMP HttpCallback::OnResponseReceived(IXMLHTTPRequest2 *pXHR, ISequentialStream *pResponseStream)
{
    UNREFERENCED_PARAMETER(pXHR);
    UNREFERENCED_PARAMETER(pResponseStream);

    // set the completion event to "triggered".
    SetEvent(m_hComplete);

    return m_hr;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::OnError
// Desc: Handle errors that have occurred during the HTTP request.
// Arguments:
//    pXHR - The interface pointer of IXMLHTTPRequest2 object.
//    hrError - The errocode for the httprequest.
// --------------------------------------------------------------------------------------
IFACEMETHODIMP HttpCallback::OnError(IXMLHTTPRequest2 *pXHR, HRESULT hrError)
{
    UNREFERENCED_PARAMETER(pXHR);

    // The Request is complete, but broken.
    SetEvent(m_hComplete);
    m_hr = hrError;

    return S_OK;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::ReadFromStream
// Desc: Demonstrate how to read from the HTTP response stream.
// Arguments:
//    pStream - the data stream read form the http response.
// --------------------------------------------------------------------------------------
HRESULT HttpCallback::ReadDataFromStream(ISequentialStream *pStream)
{
    if (pStream == NULL)
    {
        return E_INVALIDARG;
    }

    CCHAR buffer[DEFAULT_HTTP_CHUNK_SIZE];
    DWORD bytesRead = 0;
    while (bytesRead < MAX_HTTP_BUFFER_SIZE)
    {
        HRESULT hr = pStream->Read(buffer, DEFAULT_HTTP_CHUNK_SIZE - 1, &bytesRead);
        if (FAILED(hr) || bytesRead == 0)
        {
            return hr;
        }
        buffer[bytesRead] = 0;

        // We know that the JSON returned by Xbox LIVE RESTful
        // services is in UTF8, so convert the final result
        // buffer into a wide string.
        int wcharLength = ::MultiByteToWideChar(CP_UTF8,             // code page (Xbox LIVE uses UTF-8 for all JSON)
            0,                   // flags (how to handle composite characters and errors)
            &buffer[0],          // UTF-8 string to convert.
            -1,                  // Length of UTF-8 string in BYTEs, -1 if zero terminated.
            NULL,          // pointer to WCHAR buffer
            0);  // size of WCHAR buffer in characters

        WCHAR* pConverted = new WCHAR[wcharLength];
        wcharLength = ::MultiByteToWideChar(CP_UTF8,             // code page (Xbox LIVE uses UTF-8 for all JSON)
            0,                   // flags (how to handle composite characters and errors)
            &buffer[0],          // UTF-8 string to convert.
            -1,                  // Length of UTF-8 string in BYTEs, -1 if zero terminated.
            pConverted,          // pointer to WCHAR buffer
            wcharLength);  // size of WCHAR buffer in characters

        if (wcharLength != 0)
        {
            m_data.append(pConverted, wcharLength - 1); // -1 as we don't want the null terminated char
        }

        // clean up the temporary buffer and the result buffer.
        delete[] pConverted;
    }
    return S_OK;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::IsFinished
// Desc: Non-blocking test for completion of the HTTP request.
//Arguments:
//    pdwStatus - Supplies a pointer to access the status code.
// --------------------------------------------------------------------------------------
const BOOL HttpCallback::IsFinished()
{
    // execute a non-blocking wait of zero time.
    DWORD dwError = ::WaitForSingleObject(m_hComplete, 0);

    if (dwError == WAIT_FAILED)
    {
        m_hr = HRESULT_FROM_WIN32(GetLastError());
        return FALSE;
    }
    else if (dwError != WAIT_OBJECT_0)
    {
        // every other state including WAIT_TIMEOUT is a false result.
        return FALSE;
    }

    // Event was signalled, success.
    return TRUE;
}

// --------------------------------------------------------------------------------------
// Name: HttpCallback::WaitForFinish
// Desc: Blocking wait for completion of the HTTP request. Once it's done, get
//       the execution result of final call backs, and http status code if it's
//       available.
// Arguments:
//    pdwStatus - Supplies a pointer to access the status code.
// --------------------------------------------------------------------------------------
const BOOL HttpCallback::WaitForFinish()
{
    // execute a blocking wait on the completion Event.
    DWORD dwError = ::WaitForSingleObject(m_hComplete, INFINITE);
    if (dwError == WAIT_FAILED)
    {
        m_hr = HRESULT_FROM_WIN32(GetLastError());
        return FALSE;
    }
    else if (dwError != WAIT_OBJECT_0)
    {
        // every other state including WAIT_TIMEOUT is a false result.
        return FALSE;
    }

    return TRUE;
}

// ----------------------------------------------------------------------------
// Name: HttpRequest::HttpRequest
// Desc: Constructor.
// ----------------------------------------------------------------------------
HttpRequest::HttpRequest() :
    m_pXHR(nullptr),
    m_pXHRCallback(nullptr),
    m_pHttpCallback(nullptr)
{
    // Create the IXmlHttpRequest2 object.
/*    XSF_ERROR_IF_FAILED( ::CoCreateInstance( __uuidof(FreeThreadedXMLHTTP60),
                                                nullptr,
                                                CLSCTX_SERVER,
                                                __uuidof(IXMLHTTPRequest2),
                                                &m_pXHR ) );*/
    HRESULT hr = ::CoCreateInstance(__uuidof(FreeThreadedXMLHTTP60),
        nullptr,
        CLSCTX_SERVER,
        __uuidof(IXMLHTTPRequest2),
        &m_pXHR);
    if (FAILED(hr))
    {
        return;
    }

    // Create the IXmlHttpRequest2Callback object and initialize it.
    //XSF_ERROR_IF_FAILED( Microsoft::WRL::Details::MakeAndInitialize<HttpCallback>( &m_pHttpCallback ) );
    hr = Microsoft::WRL::Details::MakeAndInitialize<HttpCallback>(&m_pHttpCallback);
    if (FAILED(hr))
    {
        m_pXHR = nullptr;
        return;
    }

    //XSF_ERROR_IF_FAILED( m_pHttpCallback.As( &m_pXHRCallback ) );
    hr = m_pHttpCallback.As(&m_pXHRCallback);
    if (FAILED(hr))
    {
        m_pXHRCallback = nullptr;
        m_pXHR = nullptr;
        return;
    }

    // Specifies the HTTP stack should continuously call OnDataAvailable as data comes in with no threshold. 
    // For backwards compatibility this is the default behavior, but not the suggested setting.
    //m_pXHR->SetProperty(XHR_PROP_ONDATA_THRESHOLD, XHR_PROP_ONDATA_ALWAYS); 
}

// ----------------------------------------------------------------------------
// Name: HttpRequest::~HttpRequest
// Desc: Destructor.
// ----------------------------------------------------------------------------
HttpRequest::~HttpRequest()
{
    // ComPtr<> smart pointers should handle releasing the COM objects.
}

//--------------------------------------------------------------------------------------
// Name: HttpRequest::Open()
// Desc: Set up and kickstart an asynchronous HTTP request on a URL given specific headers
// Params:
//     verb                - HTTP verb as a wchar_t string
//     url                 - URI for the HTTP request
//     headers             - Array of HTTPHeaderInfo objects to include with the request
//     iHeaderCount        - How many headers are in the array
//     data                - Optional, Data payload for the request as void pointer
//--------------------------------------------------------------------------------------
HRESULT HttpRequest::Open(const std::wstring& verb, const std::wstring& url, const std::vector<HttpHeaderInfo>& headers, const std::string& data)
{
    if (verb.empty())
    {
        return E_INVALIDARG;
    }

    if (url.empty())
    {
        return E_INVALIDARG;
    }

    if (headers.size() == 0)
    {
        return E_INVALIDARG;
    }
    
    HRESULT hr = E_FAIL;

    // Open a connection for an HTTP GET request.
    // NOTE: This is where the IXMLHTTPRequest2 object gets given a
    // pointer to the IXMLHTTPRequest2Callback object.
    hr = m_pXHR->Open(verb.c_str(),         // HTTP method
        url.c_str(),          // URL string as wchar*
        m_pXHRCallback.Get(), // callback object from a ComPtr<>
        NULL,                 // username
        NULL,                 // password
        NULL,                 // proxy username
        NULL);               // proxy password
    if (FAILED(hr))
    {
        return hr;
    }

    //Add code to not have Durango OS add authorization header
    hr = m_pXHR->SetRequestHeader(L"xbl-authz-optout-10", L"1\r\n");
    if (FAILED(hr))
    {
        return hr;
    }

    //
    // Add the provided headers to the request from the caller, if one is
    // a required header for the signature, add it to the SigningHeaders
    // string following the standard header format "Header: value\r\n" to
    // be used with the token and signature retrieval API
    //
    for (INT i = 0; i < headers.size(); i++)
    {
        std::wstring wstrHeaderName = headers[i].wstrHeaderName;
        std::wstring wstrHeaderValue = headers[i].wstrHeaderValue;
        hr = m_pXHR->SetRequestHeader(wstrHeaderName.c_str(), wstrHeaderValue.c_str());
        if (FAILED(hr))
        {
            m_pXHR->Abort();
            return hr;
        }
    }

    if (data.length() != 0)
    {
        // Create and open a new runtime class
        m_requestStream = Make<RequestStream>();
        m_requestStream->Open(data.c_str(), data.length());

        hr = m_pXHR->Send(m_requestStream.Get(),        // body message as an ISequentialStream*
            m_requestStream->Size());    // count of bytes in the stream.
    }
    else
    {
        hr = m_pXHR->Send(NULL, 0);
    }

    if (FAILED(hr))
    {
        m_pXHR->Abort();
        return hr;
    }

    return hr;
}

//--------------------------------------------------------------------------------------
// Name: HttpRequest::Open()
// Desc: Set up and kickstart an asynchronous HTTP request on a URL given specific headers
// Params:
//     verb                - HTTP verb as a wchar_t string
//     url                 - URI for the HTTP request
//     headers             - Array of HTTPHeaderInfo objects to include with the request
//     iHeaderCount        - How many headers are in the array
//     data                - Optional, Data payload for the request as void pointer
//--------------------------------------------------------------------------------------
HRESULT HttpRequest::Open(const std::wstring& verb, const std::wstring& url, const std::vector<HttpHeaderInfo>& headers, const uint8_t* data, const size_t datalength)
{
    if (verb.empty())
    {
        return E_INVALIDARG;
    }

    if (url.empty())
    {
        return E_INVALIDARG;
    }

    if (headers.size() == 0)
    {
        return E_INVALIDARG;
    }

    HRESULT hr = E_FAIL;

    // Open a connection for an HTTP GET request.
    // NOTE: This is where the IXMLHTTPRequest2 object gets given a
    // pointer to the IXMLHTTPRequest2Callback object.
    hr = m_pXHR->Open(verb.c_str(),         // HTTP method
        url.c_str(),          // URL string as wchar*
        m_pXHRCallback.Get(), // callback object from a ComPtr<>
        NULL,                 // username
        NULL,                 // password
        NULL,                 // proxy username
        NULL);               // proxy password
    if (FAILED(hr))
    {
        return hr;
    }

    //Add code to not have Durango OS add authorization header
    hr = m_pXHR->SetRequestHeader(L"xbl-authz-optout-10", L"1\r\n");
    if (FAILED(hr))
    {
        return hr;
    }

    //
    // Add the provided headers to the request from the caller, if one is
    // a required header for the signature, add it to the SigningHeaders
    // string following the standard header format "Header: value\r\n" to
    // be used with the token and signature retrieval API
    //
    for (INT i = 0; i < headers.size(); i++)
    {
        std::wstring wstrHeaderName = headers[i].wstrHeaderName;
        std::wstring wstrHeaderValue = headers[i].wstrHeaderValue;
        hr = m_pXHR->SetRequestHeader(wstrHeaderName.c_str(), wstrHeaderValue.c_str());
        if (FAILED(hr))
        {
            m_pXHR->Abort();
            return hr;
        }
    }

    if (data != nullptr && datalength != 0)
    {
        // Create and open a new runtime class
        m_requestStream = Make<RequestStream>();
        m_requestStream->Open(reinterpret_cast<const char*>(data), datalength);

        hr = m_pXHR->Send(m_requestStream.Get(),        // body message as an ISequentialStream*
            m_requestStream->Size());    // count of bytes in the stream.
    }
    else
    {
        hr = m_pXHR->Send(NULL, 0);
    }

    if (FAILED(hr))
    {
        m_pXHR->Abort();
        return hr;
    }

    return hr;
}


// ----------------------------------------------------------------------------
// Name: HttpRequest::IsFinished()
// Desc: Test whether the request has finished, either with or without an
//       error. The HTTP state can be tested once the request is finished.
// ----------------------------------------------------------------------------
BOOL HttpRequest::IsFinished()
{
    //XSF_SAFE_RETURN_IF_NULL( m_pHttpCallback, m_pHttpCallback->IsFinished() );
    if (m_pHttpCallback == NULL)
    {
        return FALSE;
    }
    return m_pHttpCallback->IsFinished();
}

// ----------------------------------------------------------------------------
// Name: HttpRequest::WaitForFinish()
// Desc: Blocking wait for the request to complete, with or without an
//        error. The HTTP status is returned in the DWORD supplied.
// Params:
//     result - DWORD for the HTTP result of the request, e.g. "200", "404"
// ----------------------------------------------------------------------------
DWORD HttpRequest::WaitForFinish()
{
    //XSF_SAFE_RETURN_IF_NULL( m_pHttpCallback, m_pHttpCallback->WaitForFinish() );
    if (m_pHttpCallback == NULL)
    {
        return FALSE;
    }
    return m_pHttpCallback->WaitForFinish();
}

//--------------------------------------------------------------------------------------
// Name: RequestStream::RequestStream
// Desc: Constructor
//--------------------------------------------------------------------------------------
RequestStream::RequestStream()
    : m_cRef(1)
    , m_buffer(nullptr)
{
}

//--------------------------------------------------------------------------------------
// Name: RequestStream::~RequestStream
// Desc: Destructor
//--------------------------------------------------------------------------------------
RequestStream::~RequestStream()
{
    delete[] m_buffer;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::Open
//  Desc: Opens the buffer populated with the supplied data
//--------------------------------------------------------------------------------------
STDMETHODIMP RequestStream::Open(LPCSTR psBuffer, ULONG cbBufferSize)
{
    HRESULT hr = S_OK;

    if (psBuffer == nullptr || cbBufferSize > MAX_HTTP_BUFFER_SIZE)
    {
        return E_INVALIDARG;
    }

    m_buffSize = cbBufferSize;
    m_buffSeekIndex = 0;

    // Create a buffer to store a copy of the request (and include space for the null 
    // terminator, as generally this method can accept the result of strlen() for 
    // cbBufferSize). This buffer is deleted in the destructor.
    m_buffer = new (std::nothrow) char[cbBufferSize];
    if (m_buffer == nullptr)
    {
        return E_OUTOFMEMORY;
    }

    memcpy_s(m_buffer, m_buffSize, psBuffer, m_buffSize);

    return hr;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::Size
//  Desc: Returns the size of the buffer
//--------------------------------------------------------------------------------------
const STDMETHODIMP_(ULONGLONG) RequestStream::Size()
{
    return m_buffSize;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::Read
//  Desc: ISequentialStream overload: Reads data from the buffer
//--------------------------------------------------------------------------------------
STDMETHODIMP RequestStream::Read(void *pv, ULONG cb, ULONG *pcbNumReadBytes)
{
    HRESULT hr = S_OK;

    if (pv == nullptr)
    {
        return E_INVALIDARG;
    }

    BYTE* pbOutput = reinterpret_cast<BYTE*>(pv);
    const BYTE* pbInput = reinterpret_cast<BYTE*>(m_buffer);

    for (*pcbNumReadBytes = 0; *pcbNumReadBytes < cb; (*pcbNumReadBytes)++)
    {
        if (m_buffSeekIndex == m_buffSize)
        {
            hr = S_FALSE;
            break;
        }

        pbOutput[*pcbNumReadBytes] = pbInput[m_buffSeekIndex];

        m_buffSeekIndex++;
    }

    return hr;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::Write
//  Desc: ISequentialStream overload: Writes to the buffer. Not implmented, as the buffer is "read only"
//--------------------------------------------------------------------------------------
STDMETHODIMP RequestStream::Write(const void *pv, ULONG cb, ULONG *pcbWritten)
{
    UNREFERENCED_PARAMETER(pv);
    UNREFERENCED_PARAMETER(cb);
    UNREFERENCED_PARAMETER(pcbWritten);

    return E_NOTIMPL;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::QueryInterface
//  Desc: IUnknown overload: Queries for a particular interface
//--------------------------------------------------------------------------------------
STDMETHODIMP RequestStream::QueryInterface(REFIID riid, void **ppvObject)
{
    if (ppvObject == nullptr)
    {
        return E_INVALIDARG;
    }

    *ppvObject = nullptr;

    HRESULT hr = S_OK;
    void *pObject = nullptr;

    if (riid == IID_IUnknown)
    {
        pObject = static_cast<IUnknown *>((IDispatch*)this);
    }
    else if (riid == IID_IDispatch)
    {
        pObject = static_cast<IDispatch *>(this);
    }
    else if (riid == IID_ISequentialStream)
    {
        pObject = static_cast<ISequentialStream *>(this);
    }
    else
    {
        return E_NOINTERFACE;
    }

    AddRef();

    *ppvObject = pObject;
    pObject = nullptr;

    return hr;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::AddRef
//  Desc: IUnknown: Increments the reference count
//--------------------------------------------------------------------------------------
STDMETHODIMP_(ULONG) RequestStream::AddRef()
{
    return ::InterlockedIncrement(&m_cRef);
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::Release
//  Desc: IUnknown overload: Decrements the reference count, possibly deletes the instance
//--------------------------------------------------------------------------------------
STDMETHODIMP_(ULONG) RequestStream::Release()
{
    ULONG ulRefCount = ::InterlockedDecrement(&m_cRef);

    if (0 == ulRefCount)
    {
        delete this;
    }

    return ulRefCount;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::GetTypeInfoCount
//  Desc: IDispatch overload: IXMLHTTPRequest2 expects a complete IDispatch interface,
//  but doesn't actually make use of this.
//--------------------------------------------------------------------------------------
HRESULT RequestStream::GetTypeInfoCount(unsigned int* pctinfo)
{
    if (pctinfo)
    {
        *pctinfo = 0;
    }

    return E_NOTIMPL;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::GetTypeInfo
//  Desc: IDispatch overload: IXMLHTTPRequest2 expects a complete IDispatch interface,
//  but doesn't actually make use of this.
//--------------------------------------------------------------------------------------
HRESULT RequestStream::GetTypeInfo(unsigned int iTInfo, LCID  lcid, ITypeInfo** ppTInfo)
{
    if (ppTInfo)
    {
        *ppTInfo = nullptr;
    }

    UNREFERENCED_PARAMETER(lcid);
    UNREFERENCED_PARAMETER(iTInfo);

    return E_NOTIMPL;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::GetIDsOfNames
//  Desc: IDispatch overload: IXMLHTTPRequest2 expects a complete IDispatch interface,
//  but doesn't actually make use of this.
//--------------------------------------------------------------------------------------
HRESULT RequestStream::GetIDsOfNames(REFIID riid, OLECHAR** rgszNames,
    unsigned int cNames, LCID lcid, DISPID* rgDispId)
{
    UNREFERENCED_PARAMETER(riid);
    UNREFERENCED_PARAMETER(rgszNames);
    UNREFERENCED_PARAMETER(cNames);
    UNREFERENCED_PARAMETER(lcid);
    UNREFERENCED_PARAMETER(rgDispId);

    return DISP_E_UNKNOWNNAME;
}

//--------------------------------------------------------------------------------------
//  Name: RequestStream::Invoke
//  Desc: IDispatch overload: IXMLHTTPRequest2 expects a complete IDispatch interface,
//  but doesn't actually make use of this.
//--------------------------------------------------------------------------------------
HRESULT RequestStream::Invoke(
    DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags,
    DISPPARAMS* pDispParams, VARIANT* pVarResult, EXCEPINFO* pExcepInfo,
    unsigned int* puArgErr)
{
    UNREFERENCED_PARAMETER(dispIdMember);
    UNREFERENCED_PARAMETER(riid);
    UNREFERENCED_PARAMETER(lcid);
    UNREFERENCED_PARAMETER(wFlags);
    UNREFERENCED_PARAMETER(pDispParams);
    UNREFERENCED_PARAMETER(pVarResult);
    UNREFERENCED_PARAMETER(pExcepInfo);
    UNREFERENCED_PARAMETER(puArgErr);

    return S_OK;
}
// ----------------------------------------------------------------------------