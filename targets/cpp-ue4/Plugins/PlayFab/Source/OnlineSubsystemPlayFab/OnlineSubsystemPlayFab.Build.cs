// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

using UnrealBuildTool;
using System.IO;

public class OnlineSubsystemPlayFab : ModuleRules
{
    public OnlineSubsystemPlayFab(TargetInfo Target)
    {
        Definitions.Add("ONLINESUBSYSTEMPLAYFAB_PACKAGE=1");

        PrivateDependencyModuleNames.AddRange(
            new string[] {
				"Core", 
				"CoreUObject", 
				"Engine", 
				"Sockets", 
				"OnlineSubsystem", 
				"OnlineSubsystemUtils",
                "PlayFab",
                "Json"
			}
            );
    }
}
