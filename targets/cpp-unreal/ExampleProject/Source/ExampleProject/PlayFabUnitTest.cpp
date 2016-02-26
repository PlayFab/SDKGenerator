#include "ExampleProject.h"

#include "PlayFabUnitTest.h"
#include "PlayFabClientAPI.h"
#include "PlayFabClientModels.h"

UPlayFabUnitTest::UPlayFabUnitTest(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
}

UPlayFabClientAPI* UPlayFabUnitTest::UnitTestRegisterUser()
{
	FClientRegisterPlayFabUserRequest request;
	request.Username = "myUsername";
	request.Email = "email@email.com";
	request.Username = "password";
	UPlayFabClientAPI::FDelegateOnSuccessRegisterPlayFabUser onSuccess;
	UPlayFabClientAPI::FDelegateOnFailurePlayFabError onFailure;
	UPlayFabClientAPI* manager = UPlayFabClientAPI::RegisterPlayFabUser(request, onSuccess, onFailure);
	return manager;
}
