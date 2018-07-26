using UnrealBuildTool;

public class ExampleProject : ModuleRules
{
    public ExampleProject(ReadOnlyTargetRules Target) : base(Target)
    {
    	PCHUsage = PCHUsageMode.NoSharedPCHs;
    	
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore" });

        PrivateDependencyModuleNames.AddRange(new string[] {  });
    }
}
