// Copyright (C) Microsoft Corporation. All rights reserved.

#import "ViewController.h"
#include "log_bridge.h"
#include "TestAppIOS.h"

static void DebugMessageToViewCallbackFunction(const char *message, void* context);

//
// This variables are for displaying logs to a table view.
//
// Max logs are 100.
const static NSInteger kMaxLogNumber = 100;

typedef struct _LogInfo {
    NSInteger count;
    NSInteger index;
    NSInteger postCounter;
    NSString* logList[kMaxLogNumber];
} LogInfo;

static LogInfo s_logInfo = {
    0,      // number of logs
    0,      // input index
    0,      // number of posted event.
    {nil}   // log list
};

@interface ViewController ()

- (void)addLogToListWithLogString:(NSString *)log;

@property(nonatomic) NSLock* lockForLogList;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view, typically from a nib.

    memset((void*)&s_logInfo, 0, sizeof(s_logInfo));
    SetLogOutputCallback(DebugMessageToViewCallbackFunction, (__bridge void*)(self));
    [self performSelector:@selector(processUnitTest:) withObject:[NSNumber numberWithInteger:0] afterDelay:1.0];
}

- (void)dealloc {
    [NSObject cancelPreviousPerformRequestsWithTarget:self];
    ResetLogOutputCallback();
}

- (NSLock *)getLogListLock {
    if (self.lockForLogList == nil) {
        self.lockForLogList = [[NSLock alloc] init];
        NSAssert(self.lockForLogList, @"Can't create NSLock instance");
    }
    return self.lockForLogList;
}

- (void)addLogWithLog:(NSString *)log {
    [[self getLogListLock] lock];

    s_logInfo.logList[s_logInfo.index] = log;
    s_logInfo.index = (s_logInfo.index + 1) % kMaxLogNumber;
    if (s_logInfo.count < kMaxLogNumber) {
        s_logInfo.count ++;
    }

    if (s_logInfo.postCounter == 0) {
        [self performSelectorOnMainThread:@selector(updateLogList:) withObject:nil waitUntilDone:NO];
        s_logInfo.postCounter ++;
    }

    [[self getLogListLock] unlock];
}

- (void)addLogToListWithLogString:(NSString *)log {
    NSArray *chunks = [log componentsSeparatedByString: @"\n"];
    for (NSString* msg in chunks) {
        [self addLogWithLog:msg];
    }
}

- (void)updateLogList:(id)object {

    [[self getLogListLock] lock];
    s_logInfo.postCounter = 0;
    [self.tableView reloadData];
    [[self getLogListLock] unlock];
}

- (NSString *)getLogStringWithIndex:(NSInteger)index {
    NSString    *logString = nil;

    [[self getLogListLock] lock];

    if (index < s_logInfo.count) {
        index = s_logInfo.index - index - 1;
        if (index < 0) {
            index = kMaxLogNumber + index;
        }
        NSAssert(index >= 0 && index < kMaxLogNumber, @"Out of range.");
        logString = s_logInfo.logList[index];
    }

    [[self getLogListLock] unlock];

    return logString;
}

- (void)processUnitTest:(id)object {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        RunUnittest();
    });
}

#pragma mark - Table view data source

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView {
    return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return s_logInfo.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    UITableViewCell *cell = nil;

    cell = [tableView dequeueReusableCellWithIdentifier:@"DebugLogCellReuseIdentifier" forIndexPath:indexPath];
    if (cell == nil) {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleValue1 reuseIdentifier:@"DebugLogCellReuseIdentifier"];
        NSAssert(cell, @"Should not be null");
    }

    // Configure the cell...
    cell.textLabel.numberOfLines = 3;
    cell.textLabel.adjustsFontSizeToFitWidth = true;
    cell.textLabel.minimumScaleFactor = 0.7;
    cell.textLabel.backgroundColor = [UIColor clearColor];
    if (indexPath.row % 2) {
        cell.backgroundColor = [UIColor colorWithRed:1.0 green:1.0 blue:1.0 alpha:1.0];
    } else {
        cell.backgroundColor = [UIColor colorWithRed:0.8 green:0.8 blue:0.8 alpha:1.0];
    }
    cell.textLabel.text = [self getLogStringWithIndex:indexPath.row];

    return cell;
}

@end

static void DebugMessageToViewCallbackFunction(const char *message, void* context)
{
    if (context)
    {
        NSString* msg = [NSString stringWithUTF8String:message];
        [((__bridge ViewController*)context) addLogToListWithLogString:msg];
    }
}
