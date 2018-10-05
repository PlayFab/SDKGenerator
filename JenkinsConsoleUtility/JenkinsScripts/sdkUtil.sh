#!/bin/bash
# USAGE: . util.sh
# Includes a bunch of sdk-specific functions shared by other scripts

FailIfPublishing() {
    echo $1
    if [ "$GitDestBranch" != "doNotCommit" ]; then
        exit 1 # We cannot commit to this branch name
    else
        echo "  .. but it is ok, because we will not commit to that branch"
    fi
}

# Invalid branch names and reasonings:
# "invalid": a default-placeholder so that people do not do builds without making a choice
# "automated": the old branch name, and we want to make a clean break from it (and debug any leftover problems)
# "master": we never want to commit directly to master, ever, for any reason
# "versioned": we never want to commit directly to versioned, ever, for any reason
#
# $GitDestBranch == "doNotCommit" ignores restrictions, because it will still use "doNotCommit" for the local machine build, but will not commit to it, so it is safe
# Verticalized builds prepend with "vertical-", so edge-case vertical names cannot clobber a branch we want to protect
CheckVerticalizedParameters() {
    # Typical builds will meet none of these conditions, and this function will have no effect
    if [ -z "$GitDestBranch" ] || [ "$GitDestBranch" = "invalid" ] || [ "$GitDestBranch" = "master" ] || [ "$GitDestBranch" = "versioned" ] || [ "$GitDestBranch" = "automated" ]; then
        FailIfPublishing "INVALID GitDestBranch: ($GitDestBranch, $VerticalName)"
    elif [ "$GitDestBranch" = "verticalName" ]; then
        if [ -z "$VerticalName" ]; then
            FailIfPublishing "INVALID GitDestBranch, cannot be assigned to VerticalName: ($GitDestBranch, $VerticalName)"
        else
            # This is the expected-correct path for verticalized-builds
            GitDestBranch="vertical-$VerticalName"
        fi
    fi
    if [ "$VerticalName" = "master" ]; then
        echo "VerticalName = master, should not be manually specified, it's implied. (A lot of stuff will break if master is explicit)"
        return 1 # We want to fail this case, regardless of publish state
    elif [ ! -z "$VerticalName" ]; then
        if [ "$GitDestBranch" != "verticalName" ]; then
            FailIfPublishing "Output branch must be verticalName when building a vertical"
        elif [ "$apiSpecSource" != "-apiSpecPfUrl" ] && [ "$apiSpecSource" != "-apiSpecPfUrl https://${VerticalName}.playfabapi.com/apispec" ]; then
            echo "apiSpecSource must be -apiSpecPfUrl when building a vertical, or else it won't build what you expect"
            return 1
        fi
    fi
}

CheckApiSpecSourceDefault() {
    if [ -z "$apiSpecSource" ]; then
        apiSpecSource="-apiSpecGitUrl"
    fi
    if [ "$apiSpecSource" = "-apiSpecPfUrl" ] && [ ! -z "$VerticalName" ]; then
        apiSpecSource="-apiSpecPfUrl https://${VerticalName}.playfabapi.com/apispec"
    fi
}

CheckBuildIdentifierDefault() {
    if [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$NODE_NAME" ] && [ ! -z "$EXECUTOR_NUMBER" ]; then
        buildIdentifier="-buildIdentifier JBuild_${SdkName}_${VerticalName}_${NODE_NAME}_${EXECUTOR_NUMBER}"
    fi
}

CheckVerticalNameInternalDefault() {
    if [ ! -z "$VerticalName" ]; then
        VerticalNameInternal="-VerticalName $VerticalName"
    fi
}

echo sdkUtil.sh loaded
