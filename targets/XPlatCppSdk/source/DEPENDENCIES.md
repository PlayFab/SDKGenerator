Xplat C++ SDK has the following dependency tree. Dependencies must be built in the logical order (from the bottom up) before bulding Xplat C++ SDK.

Note: The SDK comes with a file `build-dependencies.bat` in the root of repo that automates the process of building dependencies described below. It uses already pre-baked makefiles and build configurations for all dependency projects to simplify process for most users. You may use this document as a reference on how to build any dependency from scratch without `build-dependencies.bat` (or modify it with any custom or additional steps).

```
Xplat SDK
|
|-- JsonCpp (https://github.com/open-source-parsers/jsoncpp)
|
|-- Curl (https://github.com/curl/curl)
    |
    |-- Open SSL (https://github.com/openssl/openssl)
    |   |
    |   |-- Zlib (https://github.com/madler/zlib)
    |
    |-- Zlib (https://github.com/madler/zlib)
```

----
ZLIB

Output:
* `zlib.lib` (static)
* `zdll.lib` + `zlib1.dll` (shared)

Original build info/pointers:
* https://github.com/madler/zlib/tree/master/win32
* https://github.com/madler/zlib/blob/master/win32/DLL_FAQ.txt

Build dependencies:
* VS 2017
* NMAKE

Build process:
* Sync https://github.com/madler/zlib
* Open 64-bit Native command line prompt for VS 2017 (x64 Native Tools Command Prompt for VS 2017). Navigate to the root of zlib repo. Run:
    * `nmake /f win32/Makefile.msc`
        * (build process will take several seconds)
* The output will be in the root of the repo.

-------
OPENSSL

Output:
* `libssl.lib`, `libcrypto.lib`
* Note: if you link with static OpenSSL libraries then you're expected to additionally link your application with `ws2_32.lib`, `wldap32.lib` and `crypt32.lib`.

Original build info/pointers:
* https://github.com/openssl/openssl/blob/OpenSSL_1_1_0-stable/INSTALL
* https://github.com/openssl/openssl/blob/OpenSSL_1_1_0-stable/NOTES.WIN
* https://github.com/openssl/openssl/blob/OpenSSL_1_1_0-stable/NOTES.PERL

Build dependencies:
* Perl 5
* NASM
* VS 2017
* NMAKE

Build process:
* Make sure Perl is installed (for example, http://www.activestate.com/ActivePerl, 5.26.1.2601). It added to system PATH automatically.
* Add `Text::Template` module to Perl (it is not part of core modules). Perl Package Manager (a GUI app installed with ActivePerl) can be used to install it (it can be found as `"Text-Template"` instead of `"Text::Template"`).
* Make sure NASM (Netwide Assembler) is installed (http://www.nasm.us). For example, Win64 version 2.14 (https://www.nasm.us/pub/nasm/releasebuilds/2.14/win64/). Save installer on a local disk first and run it as Administrator (i.e. with elevated prompt). Make sure to add the location of NASM binaries to system PATH (manually).
* Sync https://github.com/openssl/openssl/blob/OpenSSL_1_1_0-stable
* Open 64-bit Native command line prompt for VS 2017 (x64 Native Tools Command Prompt for VS 2017). Navigate to a directory where you want the build output to be. Run:
    * `perl <relative-or-absolute-path-to-openssl-repo-root/>Configure VC-WIN64A no-shared zlib --with-zlib-include=DIR --with-zlib-lib=LIB`
        * (It will configure build environment. In the process you may receive a warning message that nmake or dmake is not installed. In my case, nmake was accessible from command line so that statement didn't seem to be true).
        * (`DIR` is the path to a directory with zlib's header files, `LIB` is the location and the name of zlib's lib file)
    * modify makefile as needed to specify `/MT` or `/MD` in `CFLAGS` (`LIB_CFLAGS`, `BIN_CFLAGS`). More about this here, step 6: https://stackoverflow.com/questions/50365513/building-a-static-version-of-openssl-library-using-md-switch
    * `nmake`
        * (build process will take several minutes)
* The output will be in the root of the directory.

----
CURL

Output:
* `libcurl_a.lib`
* Note: you may need to add also `normaliz.lib` to your linker (when using a static curl library)

Original build info/pointers:
* https://github.com/curl/curl/tree/master/winbuild
* https://github.com/curl/curl/blob/master/winbuild/BUILD.WINDOWS.txt

Build dependencies:
* VS 2017
* NMAKE

Build process:
* Sync https://github.com/curl/curl
* Copy dependencies to:
```
    |_deps
      |_ lib
      |_ include
      |_ bin
```
  where `deps` directory is at the same level as curl repo directory (not inside the curl repo directory!)
* Navigate to the root of curl repo. Run:
    * `buildconf.bat`
* Open 64-bit Native command line prompt for VS 2017 (x64 Native Tools Command Prompt for VS 2017). Navigate to the winbuild subdirectory in the root of curl repo. Run:
    * `nmake /f Makefile.vc mode=<dll or static> VC=15 WITH_SSL=<dll or static> WITH_ZLIB=<dll or static> MACHINE=x64`
        * (it builds with `/MD` option by default (recommended). If static linking with CRT is required for some reason then add `RTLIBCFG=static` parameter to `nmake` command)
        * (build process will take several minutes)
* The output will be in the `/builds` subdirectory in the root of curl repo.

----
JSONCPP

Output:
* `lib_json.lib`

Original build info/pointers:
* https://github.com/open-source-parsers/jsoncpp/blob/master/README.md
* https://github.com/open-source-parsers/jsoncpp/tree/master/makefiles/msvc2010

Build dependencies:
* VS 2017
* MSBuild

Build process:
* Sync https://github.com/open-source-parsers/jsoncpp
* Open 64-bit Native command line prompt for VS 2017 (x64 Native Tools Command Prompt for VS 2017). Navigate to /makefiles/msvc2010/. Run:
    * `msbuild.exe jsoncpp.sln /nologo /t:Build /p:Configuration="Release" /p:Platform=x64`
        * (jsoncpp.sln is outdated. Consider converting/updating it for a newer version of VS or crafting your own VS project in a similar way. An example is in `/external/jsoncpp-build/` directory of XPlat C++ SDK repo)
        * (build process will take several seconds)
* The output will be within the location of VS solution.
