
#import "PlayFabConnection.h"
#import "PlayFabVersion.h"

static NSMutableArray *sharedConnectionList = nil;

@implementation PlayFabConnection
@synthesize request,completionBlock,internalConnection;


-(void)postURL:(NSString*)url body:(NSString*)body authType:(NSString*)authType authKey:(NSString*)authKey
{
    NSLog(@"postURL");
    
    NSURL *sRequestURL = [NSURL URLWithString:url];
    
    NSMutableURLRequest *myRequest = [NSMutableURLRequest requestWithURL:sRequestURL];
    NSString *sMessageLength = [NSString stringWithFormat:@"%d", (int)[body length]];
    
    [myRequest addValue: @"application/json" forHTTPHeaderField:@"Content-Type"];
    [myRequest addValue: sMessageLength forHTTPHeaderField:@"Content-Length"];
    [myRequest addValue: versionString forHTTPHeaderField:@"X-PlayFabSDK"];
    if ([authType length] != 0)
    {
        [myRequest addValue: authKey forHTTPHeaderField:authType];
    }
    [myRequest setHTTPMethod:@"POST"];
    [myRequest setHTTPBody: [body dataUsingEncoding:NSUTF8StringEncoding]];
    
    NSURLConnection *theConnection = [[NSURLConnection alloc] initWithRequest:myRequest delegate:self];
    
    if( theConnection ) {
        container = [NSMutableData data];
        
        if(!sharedConnectionList)
            sharedConnectionList = [[NSMutableArray alloc] init];
        [sharedConnectionList addObject:self];
    }else {
        NSLog(@"Some error occurred in Connection");
    }
    
}


#pragma mark NSURLConnectionDelegate methods

-(void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    
    [container appendData:data];
    
}

//If finish, return the data and the error nil
-(void)connectionDidFinishLoading:(NSURLConnection *)connection {
    
    if([self completionBlock])
        [self completionBlock](container,nil);
    
    [sharedConnectionList removeObject:self];
    
}

//If fail, return nil and an error
-(void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    
    if([self completionBlock])
        [self completionBlock](nil,error);
    
    [sharedConnectionList removeObject:self];
    
}

@end
