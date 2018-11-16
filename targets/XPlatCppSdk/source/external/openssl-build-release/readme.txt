The content of this directory is generated with the following command run in this directory in "x64 Native Tools Command Prompt for VS 2017" (after zlib was built):

perl ../openssl/Configure VC-WIN64A no-shared zlib --with-zlib-include=../deps/include/ --with-zlib-lib=../deps/lib/zlib.lib

After that, please make sure that makefile contains desired /MD or /MT type of linking with C++ Runtime Libraries (modify it as needed).