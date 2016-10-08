// Copyright 1998-2014 Epic Games, Inc. All Rights Reserved.

namespace UnrealBuildTool.Rules
{
    public class PlayFab : ModuleRules
    {
        public PlayFab(TargetInfo Target)
        {
            PrivateIncludePaths.AddRange(
                new string[] {"PlayFab/Private"}
            );

            PublicDependencyModuleNames.AddRange(
                new string[]
                {
                    "Core",
                    "CoreUObject",
                    "Engine",
                    "HTTP",
                    "Json",
                    "OnlineSubsystemUtils"
                }
            );
        }
    }
}
