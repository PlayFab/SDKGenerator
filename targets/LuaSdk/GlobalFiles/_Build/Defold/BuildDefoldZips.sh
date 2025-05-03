#!/bin/bash

pushd PlayFabClientSdk
rm -f ../../../Defold/PlayFabClientSdk.zip
cp -f PlayFabSdk.project game.project
cp -f ../../../README.md README.md
zip -r ../../../Defold/PlayFabClientSdk.zip README.md PlayFab game.project
rm -f ../../../Defold/PlayFabClientTestExample.zip
cp -f PlayFabTestExample.project game.project
zip -r ../../../Defold/PlayFabClientTestExample.zip ../../../README.md PlayFab PlayFabSdk.project PlayFabTesting game.project
popd

pushd PlayFabServerSdk
rm -f ../../../Defold/PlayFabServerSdk.zip
cp -f PlayFabSdk.project game.project
cp -f ../../../README.md README.md
zip -r ../../../Defold/PlayFabServerSdk.zip README.md PlayFab game.project
popd

pushd PlayFabSdk
rm -f ../../../Defold/PlayFabComboSdk.zip
cp -f PlayFabSdk.project game.project
cp -f ../../../README.md README.md
zip -r ../../../Defold/PlayFabComboSdk.zip README.md PlayFab game.project
popd

read -p "Press any key to continue..."
