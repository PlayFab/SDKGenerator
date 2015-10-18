Overview
========

This is the PlayFab integration plugin for [Unreal Engine 4](https://www.unrealengine.com/) that makes REST server communications to the PlayFab back-end service streamlined.

Key features:

* **No C++ coding required**, everything can be managed via blueprints
* Blueprintable FJsonObject wrapper with almost full support of Json features: different types of values, **arrays**, both ways serializarion to FString, etc.
* Blueprintable FJsonValue wrapper - **full Json features made for blueprints!**
* [PlayFab](https://PlayFab.com) REST API manager to start working with PlayFab out of the box!

Installation:

* Copy all files into your plugins folder. <Projet>/Plugins/PlayFab/
* Generate Visual Studio Files for your project.
* Rebuild your game. **That is it!**

Use:

To use the plugin, drag an API call onto the Event Graph. The API calls and the various categories can be found under Play Fab as can seen in the image below.

![PlayFabBluePrintMenu](PlayFabBluePrintMenu.jpg)

Attach the node to an event, pass in the required variables and then attach whatever you want to handle the response up to the graph like below.

![LoginEvent](LoginEvent.jpg)

Make sure to add a "Set Play Fab Settings" node to the start of the project. This node sets up the Game Title Id and more. The settings are needed to work with Play Fab.

**That is all it takes!** The PlayFab nodes will send out the API call, wait for a response and pass back the response from the PlayFab servers. Take a look at their documentation to see what each API call returns and expects.

Note: For the String array pins just make an empty array if you do not want specific key values returned but want them all.


Legal info
----------

Unreal® is a trademark or registered trademark of Epic Games, Inc. in the United States of America and elsewhere.

Unreal® Engine, Copyright 1998 – 2014, Epic Games, Inc. All rights reserved.

