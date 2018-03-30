using UnrealBuildTool;

public class PlayFabProxy : ModuleRules
{
    public PlayFabProxy(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicIncludePaths.AddRange(new string[] {
            "PlayFabProxy/Public"
        });

        PrivateIncludePaths.AddRange(new string[] {
            "PlayFabProxy/Private"
        });

        PrivateDependencyModuleNames.AddRange(new string[]{
            "CoreUObject",
            "Engine",
            "PlayFab",
            "Json"
        });

        PublicDependencyModuleNames.AddRange(new string[]{
            "Core"
        });
    }
}
