@echo off
echo === Build Xplat C++ SDK dependencies (BEGIN) ===
echo ATTENTION!
echo This batch file must be run in "x64 Native Tools Command Prompt for VS 2017"

setlocal
pushd "%~dp0"
set deps=../deps/

echo --- Cleaning up deps ---
rmdir "external/deps/" /s /q
rmdir "external/deps-release/" /s /q

echo --- Building zlib ---
pushd "external/zlib"
nmake /f win32/Makefile.msc
if /I "%ERRORLEVEL%" neq "0" (
echo zlip build failed!
exit /B %ERRORLEVEL%
) else (
echo zlib build succeeded.
)

rem - copy headers and binaries to deps
xcopy "*.h" "%deps%include/" /R /F /Y /H
xcopy "zlib.lib" "%deps%lib/" /R /F /Y /H
xcopy "zlib.pdb" "%deps%lib/" /R /F /Y /H
xcopy "zdll.lib" "%deps%lib/" /R /F /Y /H
xcopy "zdll.exp" "%deps%lib/" /R /F /Y /H
xcopy "zlib1.dll" "%deps%lib/" /R /F /Y /H
xcopy "zlib1.pdb" "%deps%lib/" /R /F /Y /H
popd

echo --- Building openssl ---
pushd "external/openssl-build-release"
rem - create a directory tree necessary for openssl build
rem - (typically created by running "perl Configure" but we are pre-baking that step
rem - for a convenience of "static" makefile that allows to modify build settings)
mkdir apps
mkdir crypto
mkdir crypto\aes
mkdir crypto\asn1
mkdir crypto\async
mkdir crypto\async\arch
mkdir crypto\bf
mkdir crypto\bio
mkdir crypto\blake2
mkdir crypto\bn
mkdir crypto\buffer
mkdir crypto\camellia
mkdir crypto\cast
mkdir crypto\chacha
mkdir crypto\cmac
mkdir crypto\cms
mkdir crypto\comp
mkdir crypto\conf
mkdir crypto\ct
mkdir crypto\des
mkdir crypto\dh
mkdir crypto\dsa
mkdir crypto\dso
mkdir crypto\ec
mkdir crypto\engine
mkdir crypto\err
mkdir crypto\evp
mkdir crypto\hmac
mkdir crypto\idea
mkdir crypto\include
mkdir crypto\include\internal
mkdir crypto\kdf
mkdir crypto\lhash
mkdir crypto\md4
mkdir crypto\md5
mkdir crypto\mdc2
mkdir crypto\modes
mkdir crypto\objects
mkdir crypto\ocsp
mkdir crypto\pem
mkdir crypto\pkcs7
mkdir crypto\pkcs12
mkdir crypto\poly1305
mkdir crypto\rand
mkdir crypto\rc2
mkdir crypto\rc4
mkdir crypto\ripemd
mkdir crypto\rsa
mkdir crypto\seed
mkdir crypto\sha
mkdir crypto\srp
mkdir crypto\stack
mkdir crypto\ts
mkdir crypto\txt_db
mkdir crypto\ui
mkdir crypto\whrlpool
mkdir crypto\x509
mkdir crypto\x509v3
mkdir engines
mkdir fuzz
mkdir include
mkdir include\openssl
mkdir ms
mkdir ssl
mkdir ssl\record
mkdir ssl\statem
mkdir test
mkdir tools
mkdir util

rem - update timestamps of make targets to prevent re-generation of premade makefile
nmake /T
rem - build openssl using premade makefile
nmake
if /I "%ERRORLEVEL%" neq "0" (
echo openssl build failed!
exit /B %ERRORLEVEL%
) else (
echo openssl build succeeded.
)

rem - copy headers and binaries to deps
xcopy "../openssl/include/openssl/*.*" "%deps%include/openssl/" /E /R /F /Y /H
xcopy "include/*.*" "%deps%include/" /E /R /F /Y /H
xcopy "libssl.lib" "%deps%lib/" /R /F /Y /H
xcopy "libcrypto.lib" "%deps%lib/" /R /F /Y /H
popd

echo --- Building curl ---
pushd "external/curl"
call buildconf.bat
if /I "%ERRORLEVEL%" neq "0" (
echo curl build config failed!
exit /B %ERRORLEVEL%
) else (
echo curl build config succeeded.
)

pushd "winbuild"
nmake /f Makefile.vc mode=static VC=15 WITH_SSL=static WITH_ZLIB=static MACHINE=x64
if /I "%ERRORLEVEL%" neq "0" (
echo curl build failed!
exit /B %ERRORLEVEL%
) else (
echo curl build succeeded.
)
popd

rem - copy headers and binaries to deps
set curlBuildDir=builds/libcurl-vc15-x64-release-static-ssl-static-zlib-static-ipv6-sspi/
xcopy "%curlBuildDir%include/*.*" "%deps%include/" /E /R /F /Y /H
xcopy "%curlBuildDir%lib/libcurl_a.lib" "%deps%lib/" /R /F /Y /H
popd

echo --- Building jsoncpp ---
pushd "external/jsoncpp-build"
msbuild.exe lib_json.sln /nologo /t:Build /p:Configuration="Release" /p:Platform=x64
if /I "%ERRORLEVEL%" neq "0" (
echo jsoncpp build failed!
exit /B %ERRORLEVEL%
) else (
echo jsoncpp build succeeded.
)

rem - copy headers and binaries to deps
xcopy "../jsoncpp/include/json/*.*" "%deps%include/json/" /E /R /F /Y /H
xcopy "x64/Release/lib_json.lib" "%deps%lib/" /R /F /Y /H
xcopy "x64/Release/lib_json.pdb" "%deps%lib/" /R /F /Y /H
popd

xcopy "external/deps/*.*" "external/deps-release/" /E /R /F /Y /H
popd
echo === Build Xplat C++ SDK dependencies (END) ===
echo All dependencies are built successfully.
exit /B 0