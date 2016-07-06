//
//  PlayFabVersion.h
//  PlayFabSDK
//
//  Created by Jackdaw on 11/12/15.
//  Copyright © 2015 PlayFab, Inc. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PlayFabSettings : NSObject

FOUNDATION_EXPORT NSString *const AD_TYPE_IDFA;
FOUNDATION_EXPORT NSString *const AD_TYPE_ANDROID_ID;

//Set the initial values of these variables in the PlayFabSettings.m file.
+ (NSString *) ProductionEnvironmentURL;
+ (NSString *) TitleId;
+ (NSString *) DeveloperSecretKey;
+ (NSString *) AdvertisingIdType;  // Set this to the appropriate AD_TYPE_X constant above
+ (NSString *) AdvertisingIdValue;


+ (void) setProductionEnvironmentURL:(NSString*)setValue;
+ (void) setTitleId:(NSString*)setValue;
+ (void) setDeveloperSecretKey:(NSString*)setValue;
+ (void) setAdvertisingIdType:(NSString*)setValue;
+ (void) setAdvertisingIdValue:(NSString*)setValue;

//identifierForAdvertising only available if you explicitly add USE_IDFA=1 to Target > Build Settings > Preprocessor Macros
#ifdef USE_IDFA
+ (NSString *)identifierForAdvertising;
#endif

@end
