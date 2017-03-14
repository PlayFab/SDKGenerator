using UnrealBuildTool;

public class PlayFab : ModuleRules
{
    public PlayFab(TargetInfo Target)
    {
        PublicIncludePaths.AddRange(new string[] {
            "PlayFab/Public"
        });

        PrivateIncludePaths.AddRange(new string[] {
            "PlayFab/Private",
        });

        PublicIncludePathModuleNames.AddRange(new string[] { "Json" });

        PublicDependencyModuleNames.AddRange(new string[]{
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "HTTP",
            "Json",
            "OnlineSubsystemUtils"
        });

        PrivateDependencyModuleNames.AddRange(new string[] { });

        DynamicallyLoadedModuleNames.AddRange(new string[] { });

        if (UEBuildConfiguration.bBuildEditor == true)
        {
            PublicDependencyModuleNames.AddRange(new string[] {
                "UnrealEd",
                "Settings",
            });
        }
    }
}
