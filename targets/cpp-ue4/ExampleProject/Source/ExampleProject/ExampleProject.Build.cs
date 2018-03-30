using UnrealBuildTool;

public class ExampleProject : ModuleRules
{
    public ExampleProject(ReadOnlyTargetRules Target) : base(Target)
    {
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "PlayFab" });
        PublicDependencyModuleNames.AddRange(new string[] { "Json", "JsonUtilities" });

        PrivateDependencyModuleNames.AddRange(new string[] {  });
    }
}
