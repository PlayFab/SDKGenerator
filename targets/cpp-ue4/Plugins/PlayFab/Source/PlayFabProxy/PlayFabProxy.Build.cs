using UnrealBuildTool;

public class PlayFabProxy : ModuleRules
{
    public PlayFabProxy(TargetInfo Target)
    {
        PublicIncludePaths.AddRange(new string[] {
            "PlayFabProxy/Public"
        });

        PrivateIncludePaths.AddRange(new string[] {
            "PlayFabProxy/Private",
        });

        PublicIncludePathModuleNames.AddRange(new string[] { "Json" });

        PublicDependencyModuleNames.AddRange(new string[]{
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "HTTP",
            "Json",
            "PlayFab",
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
