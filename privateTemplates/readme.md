# Template Repositories

The following public repositories should be synced here
* https://github.com/PlayFab/XPlatCoreTemplate

Additionally, you may sync any other private templates specific to your needs

# Quick Start
Run quickstart.sh to setup the default repo noted above. 

If you are running on windows and can't run a .sh file by default, try git bash or WSL: https://docs.microsoft.com/en-us/windows/wsl/install-win10

Modify your local quickstart.sh for every other repo you privately wish to generate for easy team access/ramp up.


# FAQ

* Why not use git-submodules
    * Git submodules are locked to a particular commit, and that's not the intended workflow
    * SdkGenerator should not be the arbiter of which version is "live" in another repo
