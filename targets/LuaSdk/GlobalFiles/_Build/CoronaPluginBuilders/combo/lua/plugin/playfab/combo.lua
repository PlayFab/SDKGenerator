-- Copyright (c) 2015 Corona Labs, Inc.
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
local Library = require "CoronaLibrary"

-- Create library
local lib = Library:new{ name='plugin.playfab.combo', publisherId='com.playfab' }

-------------------------------------------------------------------------------
-- BEGIN (Insert your implementation starting here)
-------------------------------------------------------------------------------

local json = require("plugin.playfab.combo.json")

local defaults = require("plugin.playfab.combo.defaults")
local _directories = defaults.directories
local _isDirWriteable = defaults.writePermissions
local _isDirReadable = defaults.readPermissions

function lib.loadTable( filename, baseDir )
	local result = nil
	baseDir = baseDir or _directories.loadDir

	-- Validate params
	assert( type(filename) == "string", "'loadTable' invalid filename" )
	assert( _isDirReadable[baseDir], "'loadTable' invalid baseDir" )

	local path = system.pathForFile( filename, baseDir )

	local file = io.open( path, "r" )
	if file then
		-- read all contents of file into a string
		local contents = file:read( "*a" )
		result = json.decode( contents )
		io.close( file )
	end

	return result
end

function lib.saveTable( t, filename, baseDir )
	local result = false
	baseDir = baseDir or _directories.saveDir

	-- Validate params
	assert( type(t) == "table", "'saveTable' invalid table" )
	assert( type(filename) == "string", "'saveTable' invalid filename" )
	assert( _isDirWriteable[baseDir], "'saveTable' invalid baseDir" )

	local path = system.pathForFile( filename, baseDir )

	local file = io.open( path, "w" )
	if file then
		local contents = json.encode( t )
		file:write( contents )
		io.close( file )
		result = true
	end

    return result
end

-- printTable( t [, label [, level ]] )
function lib.printTable( t, label, level )
	-- Validate params
	assert(
		"table" == type(t),
		"Bad argument 1 to 'printTable' (table expected, got " .. type(t) .. ")" )

	if label then print( label ) end
	level = level or 1

	for k,v in pairs( t ) do
		-- Indent according to nesting 'level'
		local prefix = ""
		for i=1,level do
			prefix = prefix .. "\t"
		end

		-- Print key/value pair
		print( prefix .. "[" .. tostring(k) .. "] = " .. tostring(v) )

		-- Recurse on tables
		if type( v ) == "table" then
			print( prefix .. "{" )
			printTable( v, nil, level + 1 )
			print( prefix .. "}" )
		end
	end
end


lib.IPlayFabHttps = require("plugin.playfab.combo.IPlayFabHttps")
lib.json = require("plugin.playfab.combo.json")
lib.PlayFabAdminApi = require("plugin.playfab.combo.PlayFabAdminApi")
lib.PlayFabClientApi = require("plugin.playfab.combo.PlayFabClientApi")
lib.PlayFabMatchmakerApi = require("plugin.playfab.combo.PlayFabMatchmakerApi")
lib.PlayFabServerApi = require("plugin.playfab.combo.PlayFabServerApi")
lib.PlayFabSettings = require("plugin.playfab.combo.PlayFabSettings")

local PlayFabHttpsCorona = require("plugin.playfab.combo.PlayFabHttpsCorona")
lib.IPlayFabHttps.SetHttp(PlayFabHttpsCorona) -- Assign the Corona-specific IHttps wrapper

-------------------------------------------------------------------------------
-- END
-------------------------------------------------------------------------------

-- Return library instance
return lib
