@echo off
echo ========= Setting Git Submodules to specific commits (BEGIN) =========
echo --- zlib
git submodule add https://github.com/madler/zlib.git external/zlib
if /I "%ERRORLEVEL%" gtr "1" (
exit /B %ERRORLEVEL%
)

pushd "external/zlib"
git checkout cacf7f1d4e3d44d871b605da3b647f07d718623f
if /I "%ERRORLEVEL%" neq "0" (
exit /B %ERRORLEVEL%
)
popd

echo --- openssl
git submodule add -b OpenSSL_1_1_0-stable https://github.com/openssl/openssl.git external/openssl
if /I "%ERRORLEVEL%" gtr "1" (
exit /B %ERRORLEVEL%
)

pushd "external/openssl"
git checkout 5f16ab333142de832555d3265aad243eb119b195
if /I "%ERRORLEVEL%" neq "0" (
exit /B %ERRORLEVEL%
)
popd

echo --- curl
git submodule add https://github.com/curl/curl.git external/curl
if /I "%ERRORLEVEL%" gtr "1" (
exit /B %ERRORLEVEL%
)

pushd "external/curl"
git checkout 2f5f31bb57d68b54e03bffcd9648aece1fe564f8
if /I "%ERRORLEVEL%" neq "0" (
exit /B %ERRORLEVEL%
)
popd

echo --- jsoncpp
git submodule add https://github.com/open-source-parsers/jsoncpp.git external/jsoncpp
if /I "%ERRORLEVEL%" gtr "1" (
exit /B %ERRORLEVEL%
)

pushd "external/jsoncpp"
git checkout 2baad4923e6d9a7e09982cfa4b1c5fd0b67ebd87
if /I "%ERRORLEVEL%" neq "0" (
exit /B %ERRORLEVEL%
)
popd

echo ========= Setting Git Submodules to specific commits (END) =========