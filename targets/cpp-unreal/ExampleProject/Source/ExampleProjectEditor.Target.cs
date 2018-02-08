// #define PF_UNREAL_OLD_4_14_TO_4_15

using UnrealBuildTool;
using System.Collections.Generic;

public class ExampleProjectEditorTarget : TargetRules
{
#if PF_UNREAL_OLD_4_14_TO_4_15
    public ExampleProjectEditorTarget(TargetInfo Target)
#else
    public ExampleProjectEditorTarget(TargetInfo Target) : base(Target)
#endif
    {
        Type = TargetType.Editor;
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
