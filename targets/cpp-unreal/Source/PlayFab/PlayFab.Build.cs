// Copyright 1998-2014 Epic Games, Inc. All Rights Reserved.

using System.IO;

namespace UnrealBuildTool.Rules
{
    public class PlayFab : ModuleRules
    {
        // NOTE: Please remove this section for Unreal 4.11
        private string ModulePath
        {
            get { return Path.GetDirectoryName(RulesCompiler.GetModuleFilename(this.GetType().Name)); }
        }

        private string ThirdPartyPath
        {
            get { return Path.GetFullPath(Path.Combine(ModulePath, "../../ThirdParty/")); }
        }
        // NOTE: Please remove this section for Unreal 4.11

        public PlayFab(TargetInfo Target)
        {
            PrivateIncludePaths.AddRange(
                new string[] {
                    "PlayFab/Private",
                    // ... add other private include paths required here ...
                });

            PublicDependencyModuleNames.AddRange(
                new string[]
                {
                    "Core",
                    "CoreUObject",
                    "Engine",
                    "HTTP",
                    "Json",
                    "OnlineSubsystemUtils"
                    // ... add other public dependencies that you statically link with here ...
                });

        }

    }
}
