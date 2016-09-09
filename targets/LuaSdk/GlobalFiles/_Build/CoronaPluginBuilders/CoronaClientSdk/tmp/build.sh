#!/bin/bash

path=$(dirname "$0")

LIBRARY_NAME="PLUGIN_NAME"
LIBRARY_TYPE="plugin"

# Verify arguments
usage() {
	echo "$0 [daily_build_number [dst_dir]]"
	echo ""
	echo "  daily_build_number: The daily build number, e.g. 2015.2560"
	echo "  dst_dir: If not provided, will be '$path/build'"
	exit -1
}

# Checks exit value for error
checkError() {
	if [ $? -ne 0 ]; then
		echo "Exiting due to errors (above)"
		exit -1
	fi
}

# Canonicalize relative paths to absolute paths
pushd "$path" > /dev/null
	dir=$(pwd)
	path=$dir
popd > /dev/null

# Default target version.
BUILD_TARGET="$1"
if [ -z "$BUILD_TARGET" ]; then
	BUILD_TARGET="2015.2642"
fi

# Default build directory.
BUILD_DIR="$2"
if [ ! -e "$BUILD_DIR" ]; then
	BUILD_DIR="$path/build"
fi

# Set lua compiler.
LUAC="$path/bin/luac"
BUILD_TARGET_VM="lua_51"
if [ ! -z "$3" ]; then
	LUAC="$path/bin/luac-$3"
	BUILD_TARGET_VM="$3"

	# Verify that this VM is supported.
	if [ ! -f "$LUAC" ]; then
		echo "Error: Lua VM '$3' is not supported."
		exit -1
	fi
fi

# Clean build directory.
if [ -e "$BUILD_DIR" ]; then
	rm -rf "$BUILD_DIR"
fi

# Get our Lua directory.
BUILD_DIR_LUA="$BUILD_DIR/plugins/$BUILD_TARGET/lua/$BUILD_TARGET_VM"
mkdir -p "$BUILD_DIR_LUA"

# Copy
echo "[copy]"
cp -vrf "$path/lua/$LIBRARY_TYPE" "$BUILD_DIR_LUA"
checkError

cp -vrf "$path"/metadata.json "$BUILD_DIR"
checkError

# Compile lua files.
echo ""
echo "[compile]"

"$LUAC" -v
checkError

find "$BUILD_DIR_LUA" -type f -name "*.lua" | while read luaFile; do
	echo "compiling: $luaFile"
	"$LUAC" -s -o "$luaFile" -- "$luaFile"
	checkError
done
checkError

echo ""
echo "[zip]"
ZIP_FILE="$path/plugin-$LIBRARY_NAME.zip"
cd "$BUILD_DIR" > /dev/null
	rm -f "$ZIP_FILE"
	zip -r -x '*.DS_Store' @ "$ZIP_FILE" ./*
cd - > /dev/null

echo ""
echo "[complete]"
echo "Plugin build succeeded."
echo "Zip file located at: '$ZIP_FILE'"
