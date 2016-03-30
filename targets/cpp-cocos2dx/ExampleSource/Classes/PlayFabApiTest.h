#include <fstream>
#include "PlayFabClientDataModels.h"
#include "PlayFabServerDataModels.h"
#include "PlayFabClientAPI.h"
#include "PlayFabServerAPI.h"
#include <thread>         // std::this_thread::sleep_for
#include <chrono>         // std::chrono::seconds

using namespace std;
using namespace rapidjson;
using namespace PlayFab;
using namespace PlayFab::ClientModels;
using namespace PlayFab::ServerModels;

typedef bool(*unittest_pointer)(void);

namespace PlayFabApiTest
{
	// The only thing you should access inside this namespace is the top level ExecuteTests function
	int HackishManualTestExecutor();
	string GetTestReport();
}
