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

.PARAMETER SdkName
The name(s) of the SDKs to generate as an array of strings.

.PARAMETER ApiSpecPath
The path to a local set of API specifications which will be used to generate the SDK.  If you
want to use the default API spec path used by the generation scripts, pass you can pass in
$null, an empty string, or "default".

.PARAMETER ApiSpecPfUrl
The full URL to the API Spec endpoints which will be used to download the API specification
files used to generate the SDK.  If you want to use the default API spec playfab URL used by
the generation scripts, pass you can pass in $null, an empty string, or "default".

.PARAMETER Vertical
The PlayFab vertical to use in the API Spec endpoints which will be used to download the API
specification files used to generate the SDK.  This will default to the master vertical.

.PARAMETER Cloud
The PlayFab cloud to use in the API Spec endpoints which will be used to download the API
specification files used to generate the SDK. This will default to the main vertical.

.PARAMETER ApiSpecGitUrl
Indicates that the API specifications checked into Git should be used to generate the SDK.
This is the default behavior and will be used if no other ApiSpec parameter is provided.
If you want to use the default API spec GitHub used by the generation scripts, pass you can
pass in $null, an empty string, or "default".

.PARAMETER OutputPath
The location that the generated SDKs will be written to.  This is a base folder path.  A new
folder under this path will be generated for each provided SDK platform.  The default path
points to a sibling directory to the SDKGeneratory repository called "sdks".

.PARAMETER TargetSource
Override the target source parameter name passed to the generation script.

.PARAMETER KeepSource
Indicites whether or not to remove all generated source files from the destination location.

.PARAMETER Beta
Indicates whether or not to include any APIs tagged with as beta.

.PARAMETER BuildFlags
Any additional flags you want to pass to the build.

.PARAMETER Version
Overrides the default version of the generated SDK.  Note that this will apply to ALL SDKs being
generated.  You will need to call this function multiple times if you want to use a different
version for each SDK type.  You can see the current SDK versions by looking at SdkManualNotes.json
which is downloaded by the API generator.

.EXAMPLE
Update-PlayFabSdk -SdkName CSharpSDK

Run the PlayFab API generation for the CSharp SDK using the API specification documents from
the PlayFab git repository.

.EXAMPLE
Update-PlayFabSdk CSharpSDK,JavaScriptSDK -Vertical example

Run the PlayFab API generation for the CSharp and JavaScript SDKs using the API specification
documents from the example vertical and include all of the beta SDKs.

This is functionally identical to using -ApiSpecPfUrl "https://example.playfabapi.com/apispec"

.EXAMPLE
Update-PlayFabSdk CSharpSDK,JavaScriptSDK -Vertical example -Cloud sample

Run the PlayFab API generation for the CSharp and JavaScript SDKs using the API specification
documents from the example vertical and the sample cloud.

This is functionally identical to using -ApiSpecPfUrl "https://example.sample.playfabapi.com/apispec"

.EXAMPLE
Update-PlayFabSdk UnitySDK -Beta

Run the PlayFab API generation for the CSharp and JavaScript SDKs using the API specification
documents from the example vertical and include all of the beta SDKs.

#>
[CmdletBinding(SupportsShouldProcess = $true, DefaultParameterSetName = "ApiSpecGitUrl")]
param(
    [Parameter(Position = 0, ValueFromPipeline = $true, ValueFromPipelineByPropertyName = $true, Mandatory)]
    [ArgumentCompleter(
        {
            param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
            @(
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
                "XPlatCoreTemplate"
             ) -like "$WordToComplete*"
        }
    )]
    [string[]]$SdkName,
    [Parameter(ParameterSetName="ApiSpecPath", ValueFromPipelineByPropertyName = $true)]
    [AllowEmptyString()]
    [string]$ApiSpecPath,
    [Parameter(ParameterSetName="ApiSpecPfUrl", ValueFromPipelineByPropertyName = $true)]
    [AllowEmptyString()]
    [string]$ApiSpecPfUrl,
    [Parameter(ParameterSetName="ApiSpecPfUrlCloudVertical", ValueFromPipelineByPropertyName = $true)]
    [string]$Vertical = "master",
    [Parameter(ParameterSetName="ApiSpecPfUrlCloudVertical", ValueFromPipelineByPropertyName = $true)]
    [string]$Cloud,
    [Parameter(ParameterSetName="ApiSpecGitUrl", ValueFromPipelineByPropertyName = $true)]
    [AllowEmptyString()]
    [string]$ApiSpecGitUrl,
    [Parameter(ValueFromPipelineByPropertyName = $true)]
    [string]$OutputPath = "..\..\sdks",
    [Parameter(ValueFromPipelineByPropertyName = $true)]
    [string]$TargetSource,
    [Parameter(ValueFromPipelineByPropertyName = $true)]
    [switch]$KeepSource,
    [Parameter(ValueFromPipelineByPropertyName = $true)]
    [switch]$Beta,
    [Parameter(ValueFromPipelineByPropertyName = $true)]
    [string[]]$BuildFlags,
    [Parameter(ValueFromPipelineByPropertyName = $true)]
    [string]$Version
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
        "XPlatCoreTemplate" = "xplatcoretemplate";
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

    if($PSCmdlet.ParameterSetName -eq "ApiSpecPath")
    {
        $apiSpecSource = "-apiSpecPath"

        if($ApiSpecPath -and ($ApiSpecPath -ne "default"))
        {
            if(!(Test-Path $ApiSpecPath))
            {
                throw "Unable to find ApiSpecPath '$ApiSpecPath'."
            }

            $apiSpecSource += " $ApiSpecPath"
        }
    }
    elseif($PSCmdlet.ParameterSetName -eq "ApiSpecPfUrl" -or $PSCmdlet.ParameterSetName -eq "ApiSpecPfUrlCloudVertical")
    {
        $apiSpecSource = "-apiSpecPfUrl"

        if($PSCmdlet.ParameterSetName -eq "ApiSpecPfUrlCloudVertical")
        {
            if(!$Cloud -and !$Vertical)
            {
                throw "You must provide a value for Cloud or Vertical"
            }

            # If either cloud or vertical is not provided, we want to remove the leading or trailing dot.
            $cloudVertical = "$Vertical.$Cloud".TrimEnd(".")
            $ApiSpecPfUrl = "https://$cloudVertical.playfabapi.com/apispec"
        }

        if($ApiSpecPfUrl -and ($ApiSpecPfUrl -ne "default"))
        {
            if(![Uri]::IsWellFormedUriString($ApiSpecPfUrl, "Absolute"))
            {
                throw "You must specify a valid URL for ApiSpecPfUrl.  Unable to parse '$ApiSpecPfUrl' as a URL."
            }

            $apiSpecSource += " $ApiSpecPfUrl"
        }
    }
    else
    {
        $apiSpecSource = "-apiSpecGitUrl"

        if($ApiSpecGitUrl -and ($ApiSpecGitUrl -ne "default"))
        {
            if(![Uri]::IsWellFormedUriString($ApiSpecGitUrl, "Absolute"))
            {
                throw "You must specify a valid URL for ApiSpecGitUrl.  Unable to parse '$ApiSpecGitUrl' as a URL."
            }

            $apiSpecSource += " $ApiSpecGitUrl"
        }
    }

    Write-Verbose "API Spec Source: $apiSpecSource"
}

process
{
    foreach($targetSdkName in $SdkName)
    {
        $sdkTargetSource = $TargetSource
        if(!$sdkTargetSource)
        {
            $sdkTargetSource = $sdkTargetSrcMap[$targetSdkName]
            Write-Verbose "Setting Targetsource to $sdkTargetSource for $targetSdkName"
            if(!$sdkTargetSource)
            {
                throw "Unable to determine TargetSource for '$targetSdkName'.  You must explicitly provide a value."
            }
        }

        $destPath = Join-Path $sdksPath $targetSdkName

        if(!(Test-Path $destPath))
        {
            $repoPath = "https://github.com/PlayFab/$targetSdkName"

            if($PSCmdlet.ShouldProcess(
                "Cloning SDK Repository for $targetSdkName into '$destPath'.",
                "Would you like to clone the $targetSdkName repository from $repoPath into '$destPath'?",
                "Unable to find $targetSdkName repository")
              )
            {
                git clone $repoPath $destPath
            }
        }

        if(!$KeepSource -and (Test-Path $destPath))
        {
            Remove-Item $destPath -Recurse -Include *.as, *.cpp, *.cs, *.h, *.java, *.js, *.lua, *.m, *.php, *.py, *.ts
        }

        $buildIdentifier = ""
        if($env:NODE_NAME)
        {
            $buildIdentifier = "-buildIdentifier JBuild_$($targetSdkName)_($env:NODE_NAME)_$($env:EXECUTOR_NUMBER)"
        }

        if(!$BuildFlags)
        {
            $BuildFlags = @()
        }

        if($Beta)
        {
            $BuildFlags += "beta"
        }

        if($targetSdkName -eq "UnrealMarketplacePlugin")
        {
            $BuildFlags += "nonnullable"
        }

        $buildFlagsParameter = "";
        if($BuildFlags)
        {
            $buildFlagsParameter = "-flags $($BuildFlags -join " ")"
        }

        $versionParameter = ""
        if($Version)
        {
            $versionParts = $Version -split ('\.')
            if($versionParts.Length -eq 2)
            {
                $Version += "." + (Get-Date -Format "yyMMdd")
            }
            elseif($versionParts.Length -ne 3)
            {
                throw "You must provide a two or three part version in the form <major>.<minor>[.<yymmdd>]"
            }
            $versionParameter = "-version $Version"
        }

        $expression = "node generate.js `"$sdkTargetSource=$destPath`" -nowait $apiSpecSource $buildFlagsParameter $versionParameter $buildIdentifier".Trim()
        if($PSCmdlet.ShouldProcess(
            "Executing '$expression'.",
            "Would you like to generate $targetSdkName into '$destPath'?",
            "Generating $targetSdkName"
        ))
        {
            Push-Location (Split-Path $PSScriptRoot -Parent)
            Invoke-Expression $expression
            Pop-Location
        }

    }
}