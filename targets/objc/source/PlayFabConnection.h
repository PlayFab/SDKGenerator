#import <Foundation/Foundation.h>

@interface PlayFabConnection : NSObject <NSURLConnectionDelegate, NSURLConnectionDataDelegate> {
    NSURLConnection * internalConnection;
    //@property
    NSMutableData * container;
}


@property (nonatomic,copy)NSURLConnection * internalConnection;
@property (nonatomic,copy)NSURLRequest *request;
@property (nonatomic,copy)void (^completionBlock) (id obj, NSError * err);



-(void)postURL:(NSString*)url body:(NSString*)body authType:(NSString*)authType authKey:(NSString*)authKey;


@end