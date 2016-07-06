//
//  ModelBase.h
//  PlayFab Obj-C SDK
//
//  Created by Jackdaw on 2/03/16.
//  Copyright (c) 2016 PlayFab, Inc. All rights reserved.
//
//  Basic class for data models, used for parsing to and from the server.

#import <Foundation/Foundation.h>


@interface PlayFabBaseModel : NSObject

-(id)initWithDictionary:(NSDictionary*)JSON;
-(NSString*)JSONStringWithClass:(Class)classToConvert;

+ (NSDateFormatter*)timestampFormatter;

@end
