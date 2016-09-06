-- This example creates a text widget on the screen
--   and then runs the internal PlayFab test-suite (not required)
--   and displays the results of those tests to the text widget
-- It is designed to be a Script for a Corona Gui

local PlayFabApiTestSuite = require("PlayFabTesting.PlayFabApiTestSuite")
local PlayFabSettings = require("PlayFab.PlayFabSettings")
local IPlayFabHttps = require("PlayFab.IPlayFabHttps")
local PlayFabHttps_Corona = require("PlayFab.PlayFabHttps_Corona")

local TestCorona = {}

function TestCorona.ExecuteTests()
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
end

return TestCorona
