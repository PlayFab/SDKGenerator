//
//  PlayFabVersion.h
//  PlayFabSDK
//
//  Created by Jackdaw on 11/12/15.
//  Copyright © 2015 PlayFab, Inc. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PlayFabSettings : NSObject

//Set the initial values of these variables in the PlayFabSettings.m file.
+ (NSString *) ProductionEnvironmentURL;
+ (NSString *) TitleId;
+ (NSString *) DeveloperSecretKey;
+ (NSString *) VerticalName;


+ (void) setProductionEnvironmentURL:(NSString*)setValue;
+ (void) setTitleId:(NSString*)setValue;
+ (void) setDeveloperSecretKey:(NSString*)setValue;
+ (void) setVerticalName:(NSString*)setValue;

//identifierForAdvertising only available if you explicitly add USE_IDFA=1 to Target > Build Settings > Preprocessor Macros
#ifdef USE_IDFA
+ (NSString *)identifierForAdvertising;
#endif

@end
