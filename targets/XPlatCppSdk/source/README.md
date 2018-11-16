# XPlatCppSdk
Cross Platform C++ SDK

This SDK lets you make REST API calls to the PlayFab service. It depends on several external third-party open source libraries referenced as git submodules in directory `/external`. Please make sure to use `--recurse-submodules` command line parameter when cloning SDK's git repo, or run the following commands afterwards to sync the content of submodules:

```
git submodule update --recursive
git submodule update --init --recursive
```

**ATTENTION! The dependencies must be built from their source code first, before building the SDK itself.**

---
### Building dependencies
#### Windows platform:
The file `build-dependencies.bat` in the root of SDK repo simplifies the process of building dependencies from source. It is based on instructions provided by the authors of third-party libraries and it uses command line utilities like `nmake`. It must be run from a specific Visual Studio's development environment command prompt: `x64 Native Tools Command Prompt for VS 2017` (installed with any edition of Visual Studio 2017). The operation may take several minutes but it needs to run only once.

Important! Building OpenSSL dependency from source requires specific tools installed:
* Perl 5 (http://www.activestate.com/ActivePerl, 5.26.1.2601 was used). Make sure it adds to system PATH.
* NASM (Netwide Assembler) (https://www.nasm.us/pub/nasm/releasebuilds/2.14/win64/, Win64 version 2.14 was used). Save installer on a local disk first and run it as Administrator (i.e. with elevated prompt). Make sure to add the location of NASM binaries to system PATH (manually)

Please refer to [DEPENDENCIES.md](DEPENDENCIES.MD) for more details or if you need to customize/change the process of building dependencies.

#### Other platforms:
Please follow corresponding instructions paired with a platform's build solution/script.

---
BETA!

Currently, this SDK is not yet part of our normal publish pipeline, nor does it have the full testing. (We're working on this). The features that are most in need of testing are json <-> timestamp conversions, and arbitrary input/output parameters, such as WriteEvent and Cloud Script. (These two may not be fully working yet).

This source code of SDK itself is generated from our [SdkGenerator](https://github.com/PlayFab/SdkGenerator)

---
## 1. Overview:

This document describes the process of configuring and building the PlayFab Cross Platform C++ SDK.

## 2. Prerequisites:

* Visual Studio 2017
* Users should be very familiar with the topics covered in our [getting started guide](https://api.playfab.com/docs/general-getting-started).

## 3. Installation & Configuration Instructions:

Currently this project is a combined SDK and Example.

* Build dependencies (if needed)
* Build SDK

## 4. Troubleshooting:

For a complete list of available APIs, check out the [online documentation](http://api.playfab.com/Documentation/).

#### Contact Us
We love to hear from our developer community!
Do you have ideas on how we can make our products and services better?

Our Developer Success Team can assist with answering any questions as well as process any feedback you have about PlayFab services.

[Forums, Support and Knowledge Base](https://community.playfab.com/index.html)

## 5. Copyright and Licensing Information:

Apache License --
  Version 2.0, January 2004
  http://www.apache.org/licenses/

  Full details available within the LICENSE file.
