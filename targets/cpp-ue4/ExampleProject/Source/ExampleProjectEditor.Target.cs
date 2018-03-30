// #define PF_UNREAL_OLD_4_16_TO_4_17

using UnrealBuildTool;
using System.Collections.Generic;

public class ExampleProjectEditorTarget : TargetRules
{
    public ExampleProjectEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        ExtraModuleNames.AddRange(new string[] { "ExampleProject" });
    }

    //
    // TargetRules interface.
    //

#if PF_UNREAL_OLD_4_16_TO_4_17
    public override void SetupBinaries(
        TargetInfo Target,
        ref List<UEBuildBinaryConfiguration> OutBuildBinaryConfigurations,
        ref List<string> OutExtraModuleNames
        )
    {
        OutExtraModuleNames.AddRange( new string[] { "ExampleProject" } );
    }
#endif
}
