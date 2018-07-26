namespace UnrealBuildTool.Rules
{
    public class PlayFab : ModuleRules
    {
        public PlayFab(ReadOnlyTargetRules Target) : base(Target)
        {
            PCHUsage = PCHUsageMode.NoSharedPCHs;

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
                }
            );
        }
    }
}
