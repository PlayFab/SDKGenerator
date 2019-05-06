<#
.SYNOPSIS
Generate the PlayFab SDK for a platform or language

.DESCRIPTION
Executes the PlayFab SDK generator to create a new copy of the SDK.  This can be targetted
against a specific PlayFab vertical, or against APISpec documents generated locally or
checked into the git repository.

For some platforms, in order use the SDK after generating it you must build it and you need
some project scaffolding in order to do so.  This scaffolding comes from the SDK specific
PlayFab repositories.  This script will clone those repositories if necessary and generate
the new SDK overtop of the existing one.  This is useful to determine what changes have
occurred in the SDK.

.PARAMETER SdkNames
The names of one or more of the supported SDKs to generate an SDK for.

.PARAMETER ApiSpecPath
The path to a local set of API specifications which will be used to generate the SDK.

.PARAMETER ApiSpecUrl
The full URL to the API Spec endpoints which will be used to download the API specification
files used to generate the SDK.

.PARAMETER Vertical
The PlayFab vertical to use in the API Spec endpoints which will be used to download the API
specification files used to generate the SDK.  This will default to the master vertical.

.PARAMETER Cloud
The PlayFab cloud to use in the API Spec endpoints which will be used to download the API
specification files used to generate the SDK. This will default to the main vertical.

.PARAMETER ApiSpecGitUrl
Indicates that the API specifications checked into Git should be used to generate the SDK.
This is the default behavior and will be used if no other ApiSpec parameter is provided.

.PARAMETER OutputPath
The location that the generated SDKs will be written to.  This is a base folder path.  A new
folder under this path will be generated for each provided SDK platform.  The default path
points to a sibling directory to the SDKGeneratory repository called "sdks".

.PARAMETER TargetSource
Override the target source parameter name passed to the generation script.

.PARAMETER KeepSource
Indicites whether or not to remove all generated source files from the destination location.

.PARAMETER NonNullable
Indicates that we should generate the SDK for a platform that does not support nullable types.

.PARAMETER Beta
Indicates whether or not to include any APIs tagged with as beta.

.EXAMPLE
Update-PlayFabSdk -SdkNames CSharpSDK

Run the PlayFab API generation for the CSharp SDK using the API specification documents from
the PlayFab git repository.

.EXAMPLE
Update-PlayFabSdk CSharpSDK,JavaScriptSDK -Vertical example

Run the PlayFab API generation for the CSharp and JavaScript SDKs using the API specification
documents from the example vertical and include all of the beta SDKs.

This is functionally identical to using -ApiSpecUrl "https://example.playfabapi.com/apispec"

.EXAMPLE
Update-PlayFabSdk CSharpSDK,JavaScriptSDK -Vertical example -Cloud sample

Run the PlayFab API generation for the CSharp and JavaScript SDKs using the API specification
documents from the example vertical and the sample cloud.

This is functionally identical to using -ApiSpecUrl "https://example.sample.playfabapi.com/apispec"

.EXAMPLE
Update-PlayFabSdk UnitySDK -Beta

Run the PlayFab API generation for the CSharp and JavaScript SDKs using the API specification
documents from the example vertical and include all of the beta SDKs.

#>
[CmdletBinding(SupportsShouldProcess = $true, DefaultParameterSetName = "ApiSpecGitUrl")]
param(
    [Parameter(Position = 1, ValueFromPipeline = $true, ValueFromPipelineByPropertyName = $true, Mandatory)]
    [ValidateSet(
        "ActionScriptSDK",
        "Cocos2d-xSDK",
        "CSharpSDK",
        "JavaSDK",
        "JavaScriptSDK",
        "LuaSDK",
        "NodeSDK",
        "Objective_C_SDK",
        "PhpSDK",
        "PostmanCollection",
        "PythonSDK",
        "SdkTestingCloudScript",
        "UnrealMarketplacePlugin",
        "UnitySDK",
        "WindowsSDK",
        "XPlatCppSDK")]
    [string[]]$SdkNames,
    [Parameter(ParameterSetName="ApiSpecPath")]
    [string]$ApiSpecPath,
    [Parameter(ParameterSetName="ApiSpecUrl")]
    [string]$ApiSpecUrl,
    [Parameter(ParameterSetName="ApiSpecUrlCloudVertical")]
    [string]$Vertical = "master",
    [Parameter(ParameterSetName="ApiSpecUrlCloudVertical")]
    [string]$Cloud,
    [Parameter(ParameterSetName="ApiSpecGitUrl")]
    [switch]$UseApiSpecFromGit,
    [string]$OutputPath = "..\..\sdks",
    [string]$TargetSource,
    [switch]$KeepSource,
    [switch]$NonNullable,
    [switch]$Beta
)

begin
{
    if(!(Get-Command node))
    {
        throw "You must have Node.js installed to generate the SDK"
    }

    $sdkTargetSrcMap = @{
        "ActionScriptSDK" = "actionscript";
        "Cocos2d-xSDK" = "cpp-cocos2dx";
        "CSharpSDK" = "csharp";
        "JavaSDK" = "java";
        "JavaScriptSDK" = "javascript";
        "LuaSDK" = "LuaSdk";
        "NodeSDK" = "js-node";
        "Objective_C_SDK" = "objc";
        "PhpSDK" = "PhpSdk";
        "PostmanCollection" = "postman";
        "PythonSDK" = "PythonSdk";
        "SdkTestingCloudScript" = "SdkTestingCloudScript";
        "UnrealMarketplacePlugin" = "UnrealMarketplacePlugin";
        "UnitySDK" = "unity-v2";
        "WindowsSDK" = "windowssdk";
        "XPlatCppSDK" = "xplatcppsdk";
    }

    $sdksPath = $OutputPath
    if(![System.IO.Path]::IsPathRooted($sdksPath))
    {
        $sdksPath = Resolve-Path (Join-Path $PSScriptRoot $OutputPath)
    }

    if(!(Test-Path $sdksPath))
    {
        mkdir $sdksPath | Out-Null
    }

    if($Vertical -or $Cloud)
    {
        # If either cloud or vertical is not provided, we want to remove the leading or trailing dot.
        $cloudVertical = "$Vertical.$Cloud".TrimEnd(".")
        $ApiSpecUrl = "https://$($cloudVertical).playfabapi.com/apispec"
    }

    if($ApiSpecPath)
    {
        if(!(Test-Path $ApiSpecPath))
        {
            throw "Unable to find ApiSpecPath '$ApiSpecPath'."
        }

        $apiSpecSource = "-apiSpecPath $ApiSpecPath"
    }
    elseif($ApiSpecUrl)
    {
        if(![Uri]::IsWellFormedUriString($ApiSpecUrl, "Absolute"))
        {
            throw "You must specify a valid URL for ApiSpecUrl.  Unable to parse '$ApiSpecUrl' as a URL."
        }

        $apiSpecSource = "-apiSpecPfUrl $ApiSpecUrl"
    }
    else
    {
        $apiSpecSource = "-apiSpecGitUrl"
    }

    Write-Verbose "API Spec Source: $apiSpecSource"
}

process
{
    foreach($sdkName in $SdkNames)
    {
        if(!$TargetSource)
        {
            $TargetSource = $sdkTargetSrcMap[$sdkName]
        }
        $destPath = Join-Path $sdksPath $sdkName

        if(!(Test-Path $destPath))
        {
            $repoPath = "https://github.com/PlayFab/$sdkName"

            if($PSCmdlet.ShouldProcess(
                "Cloning SDK Repository for $sdkName into '$destPath'.",
                "Would you like to clone the $sdkName repository from $($repoPath) into '$destPath'?",
                "Unable to find $sdkName repository")
              )
            {
                git clone $repoPath $destPath
            }
        }

        # Add any overrides for a specific SDK
        if($sdkName -eq "UE4")
        {
            # We only set this value if it wasn't explicitly provided.
            if(!$NonNullable.IsPresent)
            {
                $NonNullable = $true
            }
        }

        if(!$KeepSource -and (Test-Path $destPath))
        {
            Remove-Item $destPath -Recurse -Include *.as, *.cpp, *.cs, *.h, *.java, *.js, *.lua, *.m, *.php, *.py, *.ts
        }

        $buildIdentifier = ""
        if($env:NODE_NAME)
        {
            $buildIdentifier = "-buildIdentifier JBuild_$($sdkName)_($env:NODE_NAME)_$($env:EXECUTOR_NUMBER)"
        }

        $sdkGenArgs = ""
        if($NonNullable)
        {
            $sdkGenArgs += "-flags nonnullable "
        }

        if($Beta)
        {
            $sdkGenArgs += "-flags beta "
        }


        $expression = "node generate.js `"$TargetSource=$destPath`" $apiSpecSource $sdkGenArgs $buildIdentifier"
        if($PSCmdlet.ShouldProcess(
            "Executing '$expression'.",
            "Would you like to generate $sdkName into '$destPath'?",
            "Generating $sdkName"
        ))
        {
            Push-Location (Split-Path $PSScriptRoot -Parent)
            Invoke-Expression $expression
            Pop-Location
        }

    }
}