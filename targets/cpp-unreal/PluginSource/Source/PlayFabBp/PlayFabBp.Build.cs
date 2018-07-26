namespace UnrealBuildTool.Rules
{
    public class PlayFabBp : ModuleRules
    {
        public PlayFabBp(ReadOnlyTargetRules Target) : base(Target)
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
