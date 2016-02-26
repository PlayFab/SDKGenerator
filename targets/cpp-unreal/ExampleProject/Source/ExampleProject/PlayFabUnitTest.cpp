#include "ExampleProject.h"

#include "PlayFabUnitTest.h"

UPlayFabUnitTest::UPlayFabUnitTest(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
	_mClientAPI = NULL;
}

void UPlayFabUnitTest::Activate()
{
	if (_mClientAPI)
	{
		_mClientAPI->Activate();
	}
}

UPlayFabUnitTest* UPlayFabUnitTest::UnitTestRegisterUser()
{
	FClientRegisterPlayFabUserRequest request;
	request.Username = "myUsername";
	request.Email = "email@email.com";
	request.Username = "password";
	UPlayFabUnitTest* proxy = NewObject<UPlayFabUnitTest>();
	UPlayFabClientAPI::FDelegateOnSuccessRegisterPlayFabUser onSuccess;
	onSuccess.BindUFunction(proxy, TEXT("OnSuccessUnitTestRegisterUser"));
	UPlayFabClientAPI::FDelegateOnFailurePlayFabError onFailure;
	onFailure.BindUFunction(proxy, TEXT("OnFailureUnitTestRegisterUser"));
	proxy->_mClientAPI = UPlayFabClientAPI::RegisterPlayFabUser(request, onSuccess, onFailure);
	return proxy;
}

void UPlayFabUnitTest::OnSuccessUnitTestRegisterUser(FClientRegisterPlayFabUserResult result)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnSuccessUnitTestRegisterUser"));
}

void UPlayFabUnitTest::OnFailureUnitTestRegisterUser(FPlayFabError error)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnFailureUnitTestRegisterUser"));
}
