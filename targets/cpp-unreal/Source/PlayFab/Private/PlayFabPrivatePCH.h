////////////////////////////////////////////////////////////
// PlayFab Main Header File
////////////////////////////////////////////////////////////

#pragma once

#include "CoreUObject.h"
#include "Engine.h"

#include "Delegate.h"
#include "Http.h"
#include "Map.h"
#include "Json.h"

// You should place include statements to your module's private header files here.  You only need to
// add includes for headers that are used in most of your module's source files though.
#include "ModuleManager.h"

// Enum for the UserDataPermission
UENUM(BlueprintType)
enum class EPermissionEnum : uint8
{
		PRIVATE		UMETA(DisplayName = "Private"),
		PUBLIC		UMETA(DisplayName = "Public")
};


// Enum for Region
UENUM(BlueprintType)
namespace ERegion
{
	enum Type
	{
		ANY,
		USCENTRAL,
		USEAST,
		EUWEST,
		SINGAPORE,
		JAPAN,
		BRAZIL,
		AUSTRALIA
	};
}

DECLARE_LOG_CATEGORY_EXTERN(LogPlayFab, Log, All);

#include "IPlayFab.h"

#include "PlayFabClasses.h"
