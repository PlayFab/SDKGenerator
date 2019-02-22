[CmdletBinding(SupportsShouldProcess = $true, DefaultParameterSetName = "ApiSpecGitUrl")]
param(
    [Parameter(Position = 1)]
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
    [Parameter(ParameterSetName="ApiSpecPfUrl")]
    [string]$ApiSpecPfUrl,
    [Parameter(ParameterSetName="ApiSpecPfUrlBranch")]
    [string]$ApiSpecBranch,
    [Parameter(ParameterSetName="ApiSpecGitUrl")]
    [switch]$ApiSpecGitUrl,
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

    $sdksPath = Resolve-Path (Join-Path $PSScriptRoot "..\..\sdks")

    if($ApiSpecBranch)
    {
        $ApiSpecPfUrl = "https://$($ApiSpecBranch).playfabapi.com/apispec"
    }

    if($ApiSpecPath)
    {
        if(!(Test-Path $ApiSpecPath))
        {
            throw "Unable to find ApiSpecPath '$ApiSpecPath'."
        }

        $apiSpecSource = "-apiSpecPath $ApiSpecPath"
    }
    elseif($ApiSpecPfUrl)
    {
        if(![Uri]::IsWellFormedUriString($ApiSpecPfUrl, "Absolute"))
        {
            throw "You must specify a valid URL for ApiSpecPfUrl.  Unable to parse '$ApiSpecPfUrl' as a URL."
        }

        $apiSpecSource = "-apiSpecPfUrl $ApiSpecPfUrl"
    }
    else
    {
        $apiSpecSource = "-apiSpecGitUrl"
    }
}

process
{
    foreach($sdkName in $SdkNames)
    {
        $targetSrc = $sdkTargetSrcMap[$sdkName]
        $destPath = Join-Path $sdksPath $sdkName

        if(!(Test-Path $destPath))
        {
            $repoPath = "https://github.com/PlayFab/$sdkName"
            $cloneSdk = Read-Host -Prompt "Unable to find SDK repository at '$destPath'.  Would you like to clone from $($repoPath)? [Y/N]"
            if($cloneSdk -eq "Y")
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

        if(!$KeepSource)
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

        Push-Location (Split-Path $PSScriptRoot -Parent)

        Write-Host "=== BUILDING $sdkName ==="
        $exp = "node generate.js `"$targetSrc=$destPath`" $apiSpecSource $sdkGenArgs $buildIdentifier"
        if($WhatIfPreference)
        {
            Write-Host "What if: Invoking the expression: `"$exp`""
        }
        else
        {
            Invoke-Expression $exp
        }

        Pop-Location
    }
}