// #define PF_UNREAL_OLD_4_14_TO_4_15

using UnrealBuildTool;

public class PlayFabProxy : ModuleRules
{
#if PF_UNREAL_OLD_4_14_TO_4_15
        public PlayFabProxy(TargetInfo Target)
#else
    public PlayFabProxy(ReadOnlyTargetRules ROTargetRules) : base(ROTargetRules)
#endif
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
