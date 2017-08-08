// #define PF_UNREAL_OLD_4_14_TO_4_15

namespace UnrealBuildTool.Rules
{
    public class PlayFab : ModuleRules
    {
#if PF_UNREAL_OLD_4_14_TO_4_15
        public PlayFab(TargetInfo Target)
#else
        public PlayFab(ReadOnlyTargetRules ROTargetRules) : base(ROTargetRules)
#endif
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
