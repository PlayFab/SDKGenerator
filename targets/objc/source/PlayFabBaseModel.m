//
//  ModelBase.m
//  CarLogger
//
//  Created by David Wheeler on 12/15/13.
//  Copyright (c) 2013 Veridian Dynamics. All rights reserved.
//

#import<objc/runtime.h>
#import "PlayFabBaseModel.h"
#import "PlayFabSDK.h"

#import "JAGPropertyConverter.h"

@implementation PlayFabBaseModel


+ (NSDateFormatter*)timestampFormatter
{
    static NSDateFormatter *instance = nil;
    if (instance == nil) {
        instance = [[NSDateFormatter alloc] init];
        [instance setDateFormat:@"yyyy'-'MM'-'dd'T'HH':'mm':'ss.SSS'Z'"];
        [instance setTimeZone:[NSTimeZone timeZoneForSecondsFromGMT:0]];
    }
    //instance.dateStyle = NSDateFormatterMediumStyle;
    return instance;
}

-(id)initWithDictionary:(NSDictionary*)JSON
{
    self = [super init];
    if (!self) {
        return nil;
    }
    
    JAGPropertyConverter *converter = [JAGPropertyConverter new];
    converter.identifyDict = ^(NSDictionary *dict) {
        if ([dict valueForKey:@"error"]) {
            return [PlayFabError class];
        }
        return [NSNull class];
    };
    [converter setConvertFromDate:^(id obj)
     {
         return [[PlayFabBaseModel timestampFormatter] stringFromDate:obj];
     }];
    
    self = [converter composeModelFromObject:JSON];
    return self;
}

-(NSString*)JSONStringWithClass:(Class)classToConvert
{
    //Serialization:
    NSError *jsonError = nil;
    JAGPropertyConverter *converter = [[JAGPropertyConverter alloc] initWithOutputType:kJAGJSONOutput];
    converter.classesToConvert = [NSSet setWithObject:classToConvert];
    NSDictionary *jsonDictionary = [converter convertToDictionary:self];
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:jsonDictionary options:0 error:&jsonError];
    NSString *jsonString = [[NSString alloc] initWithBytes:[jsonData bytes] length:[jsonData length] encoding:NSUTF8StringEncoding];
    return jsonString;
}


//TODO: This is using non-JAG method... probably change
/*-(NSString*) JSONString {
    NSMutableDictionary *properties = [NSMutableDictionary dictionaryWithDictionary:[self propertyDictionary]];
    //[properties removeObjectsForKeys:@[@"created_at", @"updated_at"]]; // We should never send created or updated at directly
    
    NSError *jsonError = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:properties options:0 error:&jsonError];
    
    if(jsonError == nil) {
        return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    } else {
        return nil;
    }
}*/

@end
