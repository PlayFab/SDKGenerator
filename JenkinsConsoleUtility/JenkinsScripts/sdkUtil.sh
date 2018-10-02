#!/bin/bash
# USAGE: . util.sh
# Includes a bunch of sdk-specific functions shared by other scripts

# Invalid branch names and reasonings:
# "invalid": a default-placeholder so that people do not do builds without making a choice
# "automated": the old branch name, and we want to make a clean break from it (and debug any leftover problems)
# "master": we never want to commit directly to master, ever, for any reason
# "versioned": we never want to commit directly to versioned, ever, for any reason
#
# PublishToGit as false ignores these restrictions, because it will still use that branch name for the local machine build, but will not commit to it, so it is safe
# Verticalized builds prepend with "vertical-", so edge-case vertical names cannot clobber a branch we want to protect
CheckVerticalizedParameters() {
    # Typical builds will meet none of these conditions, and this function will have no effect
    if [ -z "$GitDestBranch" ] || [ "$GitDestBranch" = "invalid" ] || [ "$GitDestBranch" = "master" ] || [ "$GitDestBranch" = "versioned" ] || [ "$GitDestBranch" = "automated" ]; then
        echo "INVALID GitDestBranch: ($GitDestBranch, $VerticalName)"
        if [ "$PublishToGit" = "true" ]; then
            exit 1 # We cannot commit to this branch name
        else
            echo "  .. but it is ok, because we will not commit to that branch"
        fi
    elif [ "$GitDestBranch" = "verticalName" ]; then
        if [ -z "$VerticalName" ]; then
            echo "INVALID GitDestBranch, cannot be assigned to VerticalName: ($GitDestBranch, $VerticalName)"
            if [ "$PublishToGit" = "true" ]; then
                exit 1 # We cannot commit to this branch name
            else
                echo "  .. but it is ok, because we will not commit to that branch"
            fi
        else
            # This is the expected-correct path for verticalized-builds
            GitDestBranch="vertical-$VerticalName"
        fi
    fi
}
