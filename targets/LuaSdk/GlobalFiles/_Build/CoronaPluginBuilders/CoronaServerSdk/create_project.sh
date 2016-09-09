#!/bin/bash

path="$(dirname "$0")"

DST_DIR=$1
LIBRARY_NAME=$2

if [ ! "$DST_DIR" ] || [ ! "$LIBRARY_NAME" ]; then
	echo "Usage: $0 newProjectDir pluginName"
	exit -1
fi

# Checks exit value for error
checkError() {
	if [ $? -ne 0 ]; then
		echo "Exiting due to errors (above)"
		exit -1
	fi
}

# Canonicalize relative paths to absolute paths
pushd "$path" > /dev/null
dir="$(pwd)"
path="$dir"
popd > /dev/null

# Copy files
echo "[copy]"
if [ -d "$DST_DIR" ]; then
	echo "ERROR: The build directory already exists. Please specify a new directory or delete $DST_DIR"
	exit -1
fi
rsync -av --exclude ".git*" --exclude "*.DS_Store" --exclude "create_project.*" --exclude "*.zip" --exclude "bin/*.markdown" --exclude "Readme.markdown" --exclude "tmp/" "$path"/ "$DST_DIR"
checkError
cp "$path/tmp/build.bat" "$DST_DIR/build.bat"
checkError
cp "$path/tmp/build.sh" "$DST_DIR/build.sh"
checkError

# PLUGIN_NAME substitution
echo ""
echo "[patch]"
pushd "$DST_DIR" > /dev/null
	# Rename any file called PLUGIN_NAME to the proper name
	# ./foo/bar/PLUGIN_NAME.lua -> ./foo/bar/$LIBRARY_NAME.lua
	find . -name "*PLUGIN_NAME*" | while read file; do
		newFile="$(echo "$file" | sed "s/PLUGIN_NAME/$LIBRARY_NAME/g")"
		mv "$file" "$newFile"
		checkError
		echo "renamed: $file -> $newFile"
		file="$newFile"
	done
	checkError

	# Replace string PLUGIN_NAME inside the files with proper name 
	grep -slR "PLUGIN_NAME" . | while read file; do
		export LANG=C
		sed -i '' "s/PLUGIN_NAME/$LIBRARY_NAME/g" "$file"
		checkError
		echo "replaced: $file"
	done
	checkError
popd > /dev/null

echo ""
echo "[done]"
echo "SUCCESS: New project for ($LIBRARY_NAME) located at ($DST_DIR)."