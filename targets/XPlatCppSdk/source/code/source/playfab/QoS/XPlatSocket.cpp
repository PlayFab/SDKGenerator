#include <stdafx.h>

#pragma warning (disable: 4996)         // Suppress the warning thrown for _WINSOCK_DEPRECATED_NO_WARNINGS by the getHostByName api

#include <playfab/QoS/XPlatSocket.h>
#include <playfab/QoS/QoS.h>

#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX)
#include <sys/utime.h>
#else
#include <sys/ioctl.h>
#include <utime.h>
#endif

using namespace std;

namespace PlayFab
{
    namespace QoS
    {
        XPlatSocket::XPlatSocket()
        {
            initialized = false;
        }

        XPlatSocket::~XPlatSocket()
        {
#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX)
            closesocket(s);
            WSACleanup();
#else
            close(s);
#endif
        }

        int XPlatSocket::InitializeSocket()
        {
            // If the socket is already initialized, return 0, 
            // else initialize it
            if (initialized)
            {
                return 0;
            }

            slen = sizeof(siOther);

            int errorCode = 0;

#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX)
            // Initializing
            if ((errorCode = WSAStartup(MAKEWORD(2, 2), &wsa)) != 0)
            {
                LOG_QOS("WSAStartup failed with the error code : " << errorCode << endl);
                return errorCode;
            }
#endif

            // create socket
            if ((s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) == SOCKET_ERROR)
            {
#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX)
                errorCode = WSAGetLastError();
#endif
                LOG_QOS("Socket creation failed with the error code : " << errorCode << endl);
                return errorCode;
            }

            //setup address structure
            memset((char *)&siOther, 0, sizeof(siOther));
            siOther.sin_family = AF_INET;
            initialized = true;

            return 0;
        }

        int XPlatSocket::SetTimeout(int timeoutMs)
        {
            // If an initialization error was logged, return -1
            if (LogErrorIfNotInitialized())
            {
                return -1;
            }

#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX)
            return setsockopt(s, SOL_SOCKET, SO_RCVTIMEO | SO_SNDTIMEO, (char*)&timeoutMs, sizeof(timeoutMs));
#else
            // Input timeout is in milliseconds
            // tv_usec takes microseconds, hence convert the input milliseconds to microseconds
            struct timeval tv;
            tv.tv_usec = timeoutMs * 1000;
            return setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (struct timeval *)&tv, sizeof(struct timeval));
#endif
        }

        int XPlatSocket::SetAddress(const char* socketAddr)
        {
            // If an initialization error was logged, return -1
            if (LogErrorIfNotInitialized())
            {
                return -1;
            }

            // TODO : Optimization
            //	Find a way to cache the hostent as we can have the same address being set again.
            //	Might look into using an unordered_map<socketAddr, hostent> but that might be expensive.
            struct hostent *he = gethostbyname(socketAddr);

            if (he == NULL)
            {
                return GetLastErrorCode();
            }

            auto inAddr = (struct in_addr*) he->h_addr_list[0];

#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX)
            if (inAddr->S_un.S_addr == 0)
            {
                LOG_QOS("Address casting failed\n");
                return -1;
            }
            siOther.sin_addr.S_un.S_addr = inAddr->S_un.S_addr;
#else
            if (inAddr->s_addr == 0)
            {
                LOG_QOS("Address casting failed\n");
                return -1;
            }
            siOther.sin_addr.s_addr = inAddr->s_addr;
#endif

            // 0 indicates that the host was found
            return 0;
        }

        int XPlatSocket::SetPort(int port)
        {
            // If an initialization error was logged, return -1
            if (LogErrorIfNotInitialized())
            {
                return -1;
            }

            siOther.sin_port = htons(port);
            return 0;
        }

        int XPlatSocket::SendMessage(const char* message)
        {
            // If an initialization error was logged, return -1
            if (LogErrorIfNotInitialized())
            {
                return -1;
            }

            return sendto(s, message, strlen(message), 0, (struct sockaddr *) &siOther, slen);
        }

        int XPlatSocket::ReceiveReply(char* buf, const int& buflen)
        {
            // If an initialization error was logged, return -1
            if (LogErrorIfNotInitialized())
            {
                return -1;
            }

            return recvfrom(s, buf, buflen, 0, (struct sockaddr *) &siOther, &slen);
        }

        int XPlatSocket::GetLastErrorCode()
        {
            // If an initialization error was logged, return -1
            if (LogErrorIfNotInitialized())
            {
                return -1;
            }

            return h_errno;
        }

        bool XPlatSocket::LogErrorIfNotInitialized()
        {
            if (!initialized)
            {
                LOG_QOS("Trying to use the socket without initialization" << std::endl);
            }

            return !initialized;
        }
    }
}