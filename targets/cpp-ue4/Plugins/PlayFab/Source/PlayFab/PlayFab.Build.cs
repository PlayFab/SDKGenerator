// #define PF_UNREAL_OLD_4_14_TO_4_15

using UnrealBuildTool;

public class PlayFab : ModuleRules
{
#if PF_UNREAL_OLD_4_14_TO_4_15
        public PlayFab(TargetInfo Target)
#else
    public PlayFab(ReadOnlyTargetRules ROTargetRules) : base(ROTargetRules)
#endif
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicIncludePaths.AddRange(new string[] {
            "PlayFab/Public"
        });

        PrivateIncludePaths.AddRange(new string[] {
            "PlayFab/Private"
        });

        PublicDependencyModuleNames.AddRange(new string[]{
            "Core",
            "CoreUObject",
            "HTTP",
            "Json"
        });

        if (UEBuildConfiguration.bBuildEditor == true)
        {
            PrivateDependencyModuleNames.AddRange(new string[] {
                "Settings"
            });
        }
    }
}
