-- 
-- Abstract: PlayFab Library Plugin Test Project
-- 
-- Sample code is MIT licensed, see http://www.coronalabs.com/links/code/license
-- Copyright (C) 2015 Corona Labs Inc. All Rights Reserved.
--
------------------------------------------------------------

-- Load plugin library
local PlayFab = require "plugin.PlayFab"

-------------------------------------------------------------------------------
-- BEGIN (Insert your sample test starting here)
-------------------------------------------------------------------------------

-- This example creates a text widget on the screen
--   and then runs the internal PlayFab test-suite (not required)
--   and displays the results of those tests to the text widget
-- It is designed to be a Script for a Corona Gui

local PlayFabApiTestSuite = require("PlayFabTesting.PlayFabApiTestSuite")
local PlayFabSettings = PlayFab.PlayFabSettings
local IPlayFabHttps = PlayFab.IPlayFabHttps
local PlayFabHttps_Corona = PlayFab.PlayFabHttps_Corona

PlayFabSettings.titleId = "6195"
IPlayFabHttps.SetHttp(PlayFabHttps_Corona) -- Assign the Corona-specific IHttps wrapper

function UpdateText(displayNode, newText)
    displayNode.text = newText
    displayNode.x = displayNode.width / 2
    displayNode.y = displayNode.height / 2 - 30
end

local background = display.newImageRect( "BackGround.png", 360, 570 )
background.x = display.contentCenterX
background.y = display.contentCenterY

local textDisplay = display.newText( "", 0, 0, native.systemFont, 8 )
textDisplay:setFillColor(1,1,1)
UpdateText(textDisplay, "PlayFab tests are loading...")

-- Start the mainloop
PlayFabApiTestSuite.Start()
local function mainLoop()
    PlayFabApiTestSuite.Update()
    UpdateText(textDisplay, PlayFabApiTestSuite.GenerateTestSummary())
end
local deltaFps60 = 1000/60
gameLoopTimer = timer.performWithDelay( deltaFps60, mainLoop, 0 )

-------------------------------------------------------------------------------
-- END
-------------------------------------------------------------------------------