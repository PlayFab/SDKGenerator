#define COCOS2D_DEBUG 1

#include "cocos2d.h"

#pragma comment(lib, "wldap32.lib")
#pragma comment(lib, "ws2_32.lib")
#if (COCOS2D_VERSION < 0x00031501) // These libs don't exist in cocos 3.15, but do exist in cocos 3.13 (3.14 is unknown)
#pragma comment(lib, "libcurl_imp.lib")
#pragma comment(lib, "libzlib.lib")
#else
#pragma comment(lib, "libcurl.lib")
#pragma comment(lib, "zlib.lib")
#endif
