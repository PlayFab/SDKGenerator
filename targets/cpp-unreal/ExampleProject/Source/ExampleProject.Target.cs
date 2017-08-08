// #define PF_UNREAL_OLD_4_14_TO_4_15

using UnrealBuildTool;
using System.Collections.Generic;

public class ExampleProjectTarget : TargetRules
{
#if PF_UNREAL_OLD_4_14_TO_4_15
    public ExampleProjectTarget(TargetInfo Target)
#else
    public ExampleProjectTarget(TargetInfo Target) : base(Target)
#endif
    {
        Type = TargetType.Game;
#if !PF_UNREAL_OLD_4_14_TO_4_15
        ExtraModuleNames.Add("ExampleProject");
#endif
    }

#if PF_UNREAL_OLD_4_14_TO_4_15
    public override void SetupBinaries(
        TargetInfo Target,
        ref List<UEBuildBinaryConfiguration> OutBuildBinaryConfigurations,
        ref List<string> OutExtraModuleNames
        )
    {
        OutExtraModuleNames.AddRange(new string[] { "ExampleProject" });
    }
#endif
}
