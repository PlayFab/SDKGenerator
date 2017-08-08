// #define PF_UNREAL_OLD_4_14_TO_4_15

using UnrealBuildTool;

public class ExampleProject : ModuleRules
{
#if PF_UNREAL_OLD_4_14_TO_4_15
    public ExampleProject(TargetInfo Target)
#else
    public ExampleProject(ReadOnlyTargetRules ROTargetRules) : base(ROTargetRules)
#endif
    {
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore" });

        PrivateDependencyModuleNames.AddRange(new string[] {  });

        // Uncomment if you are using Slate UI
        // PrivateDependencyModuleNames.AddRange(new string[] { "Slate", "SlateCore" });

        // Uncomment if you are using online features
        // PrivateDependencyModuleNames.Add("OnlineSubsystem");
        // if ((Target.Platform == UnrealTargetPlatform.Win32) || (Target.Platform == UnrealTargetPlatform.Win64))
        // {
        //        if (UEBuildConfiguration.bCompileSteamOSS == true)
        //        {
        //            DynamicallyLoadedModuleNames.Add("OnlineSubsystemSteam");
        //        }
        // }
    }
}
