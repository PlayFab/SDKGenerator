local defaults = {}

defaults.directories =
{
	loadDir = system.DocumentsDirectory,
	saveDir = system.DocumentsDirectory,
}

defaults.writePermissions =
{
	[system.DocumentsDirectory] = true,
	[system.CachesDirectory] = true,
	[system.TemporaryDirectory] = true,
}

defaults.readPermissions =
{
	[system.ResourceDirectory] = true,
	[system.DocumentsDirectory] = true,
	[system.CachesDirectory] = true,
	[system.TemporaryDirectory] = true,
}

return defaults