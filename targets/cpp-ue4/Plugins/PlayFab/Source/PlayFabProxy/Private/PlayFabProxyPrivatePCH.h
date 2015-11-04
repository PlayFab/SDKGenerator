// Some copyright should be here...
#pragma once

// You should place include statements to your module's private header files here.  You only need to
// add includes for headers that are used in most of your module's source files though.

#include "ModuleManager.h"
#include "Engine.h"

#include "Delegate.h"
#include "Http.h"
#include "Map.h"
#include "Json.h"

#if WITH_EDITOR
#include "UnrealEd.h"
#endif

#include "PlayFab.h"
#include "PlayFabProxy.h"

DECLARE_LOG_CATEGORY_EXTERN(LogPlayFabProxy, Log, All);
