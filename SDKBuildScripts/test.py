import os

SdkSource = os.environ.get("SdkSource", "unity-v2")
SdkName = os.environ.get("SdkName", "UnitySdk")
SdkGenArgs = os.environ.get("SdkGenArgs", "-buildIdentifier default_manual_build")

print " === BUILDING", SdkName + ",", "from:", SdkSource + ",", "to:", SdkName + ",", "with params:", SdkGenArgs, " ===\n"

os.chdir("..")
os.system("node generate.js ..\API_Specs "+SdkSource+"=../sdks/"+SdkName+" "+SdkGenArgs)

#TODO: An option to accept inputs to build pre-defined sets if env-vars are not defined
#TODO: A list of targets, and cleaning work that should be done for each - or just reference a *-clean.bat file if exists...
#TODO: Ability to accept command line arguments if env-vars are not set?

