// #define PF_UNREAL_OLD_4_14_TO_4_15

using UnrealBuildTool;

public class ExampleProject : ModuleRules
{
#if PF_UNREAL_OLD_4_14_TO_4_15
    public ExampleProject(TargetInfo Target)
#else
    public ExampleProject(ReadOnlyTargetRules Target) : base(Target)
#endif
    {
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore" });

        PrivateDependencyModuleNames.AddRange(new string[] {  });
    }
}
