#include <stdafx.h>

#include <playfab/QoS/DataCenterResult.h>

using namespace std;

namespace PlayFab
{
    namespace QoS
    {
        DataCenterResult::DataCenterResult(const std::string& dataCenterName, int latencyMs, int errorCode) :
            dataCenterName(dataCenterName), latencyMs(latencyMs), lastErrorCode(errorCode)
        {
        }
    }
}