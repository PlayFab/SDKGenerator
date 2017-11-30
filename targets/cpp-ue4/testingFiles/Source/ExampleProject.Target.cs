// Fill out your copyright notice in the Description page of Project Settings.
// #define PF_UNREAL_OLD_4_14_TO_4_17

using UnrealBuildTool;
using System.Collections.Generic;

public class ExampleProjectTarget : TargetRules
{
	public ExampleProjectTarget(TargetInfo Target)
	{
		Type = TargetType.Game;
#if !PF_UNREAL_OLD_4_14_TO_4_17
        ExtraModuleNames.AddRange(new string[] { "ExampleProject" });
#endif
	}

	//
	// TargetRules interface.
	//

#if PF_UNREAL_OLD_4_14_TO_4_17
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
