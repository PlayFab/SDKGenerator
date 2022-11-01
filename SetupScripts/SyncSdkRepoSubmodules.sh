#!/bin/bash
set -e

# ----- git submodules check begin -----
pushd "$WORKSPACE/sdks/$SdkName"
if [ -f "set-gitmodules.bat" ]; then
    echo set-gitmodules.bat file detected, running it...
    cmd <<< "set-gitmodules.bat || exit 1"
fi
popd
# ----- git submodules check end -----
