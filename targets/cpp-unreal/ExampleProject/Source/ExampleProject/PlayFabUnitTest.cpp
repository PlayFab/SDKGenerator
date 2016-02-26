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

UPlayFabUnitTest* UPlayFabUnitTest::UnitTestRegisterPlayFabUser()
{
	FClientRegisterPlayFabUserRequest request;
	request.Username = "myUsername";
	request.Email = "email@email.com";
	request.Password = "password";
	UPlayFabUnitTest* proxy = NewObject<UPlayFabUnitTest>();
	UPlayFabClientAPI::FDelegateOnSuccessRegisterPlayFabUser onSuccess;
	onSuccess.BindUFunction(proxy, TEXT("OnSuccessRegisterPlayFabUser"));
	UPlayFabClientAPI::FDelegateOnFailurePlayFabError onFailure;
	onFailure.BindUFunction(proxy, TEXT("OnFailureRegisterPlayFabUser"));
	proxy->_mClientAPI = UPlayFabClientAPI::RegisterPlayFabUser(request, onSuccess, onFailure);
	return proxy;
}

void UPlayFabUnitTest::OnSuccessRegisterPlayFabUser(FClientRegisterPlayFabUserResult result)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnSuccessRegisterPlayFabUser"));
}

void UPlayFabUnitTest::OnFailureRegisterPlayFabUser(FPlayFabError error)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnFailureRegisterPlayFabUser"));
}

UPlayFabUnitTest* UPlayFabUnitTest::UnitTestLoginWithEmailAddress()
{
	FClientLoginWithEmailAddressRequest request;
	request.Email = "email@email.com";
	request.Password = "password";
	UPlayFabUnitTest* proxy = NewObject<UPlayFabUnitTest>();
	UPlayFabClientAPI::FDelegateOnSuccessLoginWithEmailAddress onSuccess;
	onSuccess.BindUFunction(proxy, TEXT("OnSuccessLoginWithEmailAddress"));
	UPlayFabClientAPI::FDelegateOnFailurePlayFabError onFailure;
	onFailure.BindUFunction(proxy, TEXT("OnFailureLoginWithEmailAddress"));
	proxy->_mClientAPI = UPlayFabClientAPI::LoginWithEmailAddress(request, onSuccess, onFailure);
	return proxy;
}

void UPlayFabUnitTest::OnSuccessLoginWithEmailAddress(FClientLoginResult result)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnSuccessLoginWithEmailAddress"));
}

void UPlayFabUnitTest::OnFailureLoginWithEmailAddress(FPlayFabError error)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnFailureLoginWithEmailAddress"));
}

UPlayFabUnitTest* UPlayFabUnitTest::UnitTestGetCloudScriptUrl()
{
	FClientGetCloudScriptUrlRequest request;
	request.Version = 0;
	request.Testing = false;
	UPlayFabUnitTest* proxy = NewObject<UPlayFabUnitTest>();
	UPlayFabClientAPI::FDelegateOnSuccessGetCloudScriptUrl onSuccess;
	onSuccess.BindUFunction(proxy, TEXT("OnSuccessGetCloudScriptUrl"));
	UPlayFabClientAPI::FDelegateOnFailurePlayFabError onFailure;
	onFailure.BindUFunction(proxy, TEXT("OnFailureGetCloudScriptUrl"));
	proxy->_mClientAPI = UPlayFabClientAPI::GetCloudScriptUrl(request, onSuccess, onFailure);
	return proxy;
}

void UPlayFabUnitTest::OnSuccessGetCloudScriptUrl(FClientGetCloudScriptUrlResult result)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnSuccessGetCloudScriptUrl"));
}

void UPlayFabUnitTest::OnFailureGetCloudScriptUrl(FPlayFabError error)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnFailureGetCloudScriptUrl"));
}

UPlayFabUnitTest* UPlayFabUnitTest::UnitTestRunCloudScript()
{
	FClientRunCloudScriptRequest request;
	request.ActionId = "testMe";
	request.Params = NULL;
	request.ParamsEncoded = "";
	UPlayFabUnitTest* proxy = NewObject<UPlayFabUnitTest>();
	UPlayFabClientAPI::FDelegateOnSuccessRunCloudScript onSuccess;
	onSuccess.BindUFunction(proxy, TEXT("OnSuccessRunCloudScript"));
	UPlayFabClientAPI::FDelegateOnFailurePlayFabError onFailure;
	onFailure.BindUFunction(proxy, TEXT("OnFailureRunCloudScript"));
	proxy->_mClientAPI = UPlayFabClientAPI::RunCloudScript(request, onSuccess, onFailure);
	return proxy;
}

void UPlayFabUnitTest::OnSuccessRunCloudScript(FClientRunCloudScriptResult result)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnSuccessRunCloudScript"));
}

void UPlayFabUnitTest::OnFailureRunCloudScript(FPlayFabError error)
{
	UE_LOG(LogTemp, Log, TEXT("UPlayFabUnitTest::OnFailureRunCloudScript"));
}
