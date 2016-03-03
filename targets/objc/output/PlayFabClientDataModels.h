
#import <Foundation/Foundation.h>
#import "PlayFabBaseModel.h"


	

	typedef enum
	{
		TradeStatusInvalid,
		TradeStatusOpening,
		TradeStatusOpen,
		TradeStatusAccepting,
		TradeStatusAccepted,
		TradeStatusFilled,
		TradeStatusCancelled
	} TradeStatus;


































	typedef enum
	{
		CurrencyAED,
		CurrencyAFN,
		CurrencyALL,
		CurrencyAMD,
		CurrencyANG,
		CurrencyAOA,
		CurrencyARS,
		CurrencyAUD,
		CurrencyAWG,
		CurrencyAZN,
		CurrencyBAM,
		CurrencyBBD,
		CurrencyBDT,
		CurrencyBGN,
		CurrencyBHD,
		CurrencyBIF,
		CurrencyBMD,
		CurrencyBND,
		CurrencyBOB,
		CurrencyBRL,
		CurrencyBSD,
		CurrencyBTN,
		CurrencyBWP,
		CurrencyBYR,
		CurrencyBZD,
		CurrencyCAD,
		CurrencyCDF,
		CurrencyCHF,
		CurrencyCLP,
		CurrencyCNY,
		CurrencyCOP,
		CurrencyCRC,
		CurrencyCUC,
		CurrencyCUP,
		CurrencyCVE,
		CurrencyCZK,
		CurrencyDJF,
		CurrencyDKK,
		CurrencyDOP,
		CurrencyDZD,
		CurrencyEGP,
		CurrencyERN,
		CurrencyETB,
		CurrencyEUR,
		CurrencyFJD,
		CurrencyFKP,
		CurrencyGBP,
		CurrencyGEL,
		CurrencyGGP,
		CurrencyGHS,
		CurrencyGIP,
		CurrencyGMD,
		CurrencyGNF,
		CurrencyGTQ,
		CurrencyGYD,
		CurrencyHKD,
		CurrencyHNL,
		CurrencyHRK,
		CurrencyHTG,
		CurrencyHUF,
		CurrencyIDR,
		CurrencyILS,
		CurrencyIMP,
		CurrencyINR,
		CurrencyIQD,
		CurrencyIRR,
		CurrencyISK,
		CurrencyJEP,
		CurrencyJMD,
		CurrencyJOD,
		CurrencyJPY,
		CurrencyKES,
		CurrencyKGS,
		CurrencyKHR,
		CurrencyKMF,
		CurrencyKPW,
		CurrencyKRW,
		CurrencyKWD,
		CurrencyKYD,
		CurrencyKZT,
		CurrencyLAK,
		CurrencyLBP,
		CurrencyLKR,
		CurrencyLRD,
		CurrencyLSL,
		CurrencyLYD,
		CurrencyMAD,
		CurrencyMDL,
		CurrencyMGA,
		CurrencyMKD,
		CurrencyMMK,
		CurrencyMNT,
		CurrencyMOP,
		CurrencyMRO,
		CurrencyMUR,
		CurrencyMVR,
		CurrencyMWK,
		CurrencyMXN,
		CurrencyMYR,
		CurrencyMZN,
		CurrencyNAD,
		CurrencyNGN,
		CurrencyNIO,
		CurrencyNOK,
		CurrencyNPR,
		CurrencyNZD,
		CurrencyOMR,
		CurrencyPAB,
		CurrencyPEN,
		CurrencyPGK,
		CurrencyPHP,
		CurrencyPKR,
		CurrencyPLN,
		CurrencyPYG,
		CurrencyQAR,
		CurrencyRON,
		CurrencyRSD,
		CurrencyRUB,
		CurrencyRWF,
		CurrencySAR,
		CurrencySBD,
		CurrencySCR,
		CurrencySDG,
		CurrencySEK,
		CurrencySGD,
		CurrencySHP,
		CurrencySLL,
		CurrencySOS,
		CurrencySPL,
		CurrencySRD,
		CurrencySTD,
		CurrencySVC,
		CurrencySYP,
		CurrencySZL,
		CurrencyTHB,
		CurrencyTJS,
		CurrencyTMT,
		CurrencyTND,
		CurrencyTOP,
		CurrencyTRY,
		CurrencyTTD,
		CurrencyTVD,
		CurrencyTWD,
		CurrencyTZS,
		CurrencyUAH,
		CurrencyUGX,
		CurrencyUSD,
		CurrencyUYU,
		CurrencyUZS,
		CurrencyVEF,
		CurrencyVND,
		CurrencyVUV,
		CurrencyWST,
		CurrencyXAF,
		CurrencyXCD,
		CurrencyXDR,
		CurrencyXOF,
		CurrencyXPF,
		CurrencyYER,
		CurrencyZAR,
		CurrencyZMW,
		CurrencyZWD
	} Currency;



	typedef enum
	{
		RegionUSCentral,
		RegionUSEast,
		RegionEUWest,
		RegionSingapore,
		RegionJapan,
		RegionBrazil,
		RegionAustralia
	} Region;









	typedef enum
	{
		TitleActivationStatusNone,
		TitleActivationStatusActivatedTitleKey,
		TitleActivationStatusPendingSteam,
		TitleActivationStatusActivatedSteam,
		TitleActivationStatusRevokedSteam
	} TitleActivationStatus;











	typedef enum
	{
		UserOriginationOrganic,
		UserOriginationSteam,
		UserOriginationGoogle,
		UserOriginationAmazon,
		UserOriginationFacebook,
		UserOriginationKongregate,
		UserOriginationGamersFirst,
		UserOriginationUnknown,
		UserOriginationIOS,
		UserOriginationLoadTest,
		UserOriginationAndroid,
		UserOriginationPSN,
		UserOriginationGameCenter,
		UserOriginationCustomId,
		UserOriginationXboxLive,
		UserOriginationParse
	} UserOrigination;

















	typedef enum
	{
		UserDataPermissionPrivate,
		UserDataPermissionPublic
	} UserDataPermission;




























































































































	typedef enum
	{
		MatchmakeStatusComplete,
		MatchmakeStatusWaiting,
		MatchmakeStatusGameNotFound
	} MatchmakeStatus;








	typedef enum
	{
		TransactionStatusCreateCart,
		TransactionStatusInit,
		TransactionStatusApproved,
		TransactionStatusSucceeded,
		TransactionStatusFailedByProvider,
		TransactionStatusDisputePending,
		TransactionStatusRefundPending,
		TransactionStatusRefunded,
		TransactionStatusRefundFailed,
		TransactionStatusChargedBack,
		TransactionStatusFailedByUber,
		TransactionStatusFailedByPlayFab,
		TransactionStatusRevoked,
		TransactionStatusTradePending,
		TransactionStatusTraded,
		TransactionStatusUpgraded,
		TransactionStatusStackPending,
		TransactionStatusStacked,
		TransactionStatusOther,
		TransactionStatusFailed
	} TransactionStatus;















































































//predeclare all non-enum classes

@class AcceptTradeRequest;


@class AcceptTradeResponse;


@class AddFriendRequest;


@class AddFriendResult;


@class AddSharedGroupMembersRequest;


@class AddSharedGroupMembersResult;


@class AddUsernamePasswordRequest;


@class AddUsernamePasswordResult;


@class AddUserVirtualCurrencyRequest;


@class AndroidDevicePushNotificationRegistrationRequest;


@class AndroidDevicePushNotificationRegistrationResult;


@class AttributeInstallRequest;


@class AttributeInstallResult;


@class CancelTradeRequest;


@class CancelTradeResponse;


@class CartItem;


@class CatalogItem;


@class CatalogItemBundleInfo;


@class CatalogItemConsumableInfo;


@class CatalogItemContainerInfo;


@class CharacterLeaderboardEntry;


@class CharacterResult;


@class ConfirmPurchaseRequest;


@class ConfirmPurchaseResult;


@class ConsumeItemRequest;


@class ConsumeItemResult;


@class ConsumePSNEntitlementsRequest;


@class ConsumePSNEntitlementsResult;


@class CreateSharedGroupRequest;


@class CreateSharedGroupResult;



@class CurrentGamesRequest;


@class CurrentGamesResult;


@class EmptyResult;


@class FacebookPlayFabIdPair;


@class FriendInfo;


@class GameCenterPlayFabIdPair;


@class GameInfo;


@class GameServerRegionsRequest;


@class GameServerRegionsResult;


@class GetAccountInfoRequest;


@class GetAccountInfoResult;


@class GetCatalogItemsRequest;


@class GetCatalogItemsResult;


@class GetCharacterDataRequest;


@class GetCharacterDataResult;


@class GetCharacterInventoryRequest;


@class GetCharacterInventoryResult;


@class GetCharacterLeaderboardRequest;


@class GetCharacterLeaderboardResult;


@class GetCharacterStatisticsRequest;


@class GetCharacterStatisticsResult;


@class GetCloudScriptUrlRequest;


@class GetCloudScriptUrlResult;


@class GetContentDownloadUrlRequest;


@class GetContentDownloadUrlResult;


@class GetFriendLeaderboardAroundCurrentUserRequest;


@class GetFriendLeaderboardAroundCurrentUserResult;


@class GetFriendLeaderboardAroundPlayerRequest;


@class GetFriendLeaderboardAroundPlayerResult;


@class GetFriendLeaderboardRequest;


@class GetFriendsListRequest;


@class GetFriendsListResult;


@class GetLeaderboardAroundCharacterRequest;


@class GetLeaderboardAroundCharacterResult;


@class GetLeaderboardAroundCurrentUserRequest;


@class GetLeaderboardAroundCurrentUserResult;


@class GetLeaderboardAroundPlayerRequest;


@class GetLeaderboardAroundPlayerResult;


@class GetLeaderboardForUsersCharactersRequest;


@class GetLeaderboardForUsersCharactersResult;


@class GetLeaderboardRequest;


@class GetLeaderboardResult;


@class GetPhotonAuthenticationTokenRequest;


@class GetPhotonAuthenticationTokenResult;


@class GetPlayerStatisticsRequest;


@class GetPlayerStatisticsResult;


@class GetPlayerTradesRequest;


@class GetPlayerTradesResponse;


@class GetPlayFabIDsFromFacebookIDsRequest;


@class GetPlayFabIDsFromFacebookIDsResult;


@class GetPlayFabIDsFromGameCenterIDsRequest;


@class GetPlayFabIDsFromGameCenterIDsResult;


@class GetPlayFabIDsFromGoogleIDsRequest;


@class GetPlayFabIDsFromGoogleIDsResult;


@class GetPlayFabIDsFromKongregateIDsRequest;


@class GetPlayFabIDsFromKongregateIDsResult;


@class GetPlayFabIDsFromPSNAccountIDsRequest;


@class GetPlayFabIDsFromPSNAccountIDsResult;


@class GetPlayFabIDsFromSteamIDsRequest;


@class GetPlayFabIDsFromSteamIDsResult;


@class GetPublisherDataRequest;


@class GetPublisherDataResult;


@class GetPurchaseRequest;


@class GetPurchaseResult;


@class GetSharedGroupDataRequest;


@class GetSharedGroupDataResult;


@class GetStoreItemsRequest;


@class GetStoreItemsResult;


@class GetTitleDataRequest;


@class GetTitleDataResult;


@class GetTitleNewsRequest;


@class GetTitleNewsResult;


@class GetTradeStatusRequest;


@class GetTradeStatusResponse;


@class GetUserCombinedInfoRequest;


@class GetUserCombinedInfoResult;


@class GetUserDataRequest;


@class GetUserDataResult;


@class GetUserInventoryRequest;


@class GetUserInventoryResult;


@class GetUserStatisticsRequest;


@class GetUserStatisticsResult;


@class GooglePlayFabIdPair;


@class GrantCharacterToUserRequest;


@class GrantCharacterToUserResult;


@class ItemInstance;


@class ItemPurchaseRequest;


@class KongregatePlayFabIdPair;


@class LinkAndroidDeviceIDRequest;


@class LinkAndroidDeviceIDResult;


@class LinkCustomIDRequest;


@class LinkCustomIDResult;


@class LinkFacebookAccountRequest;


@class LinkFacebookAccountResult;


@class LinkGameCenterAccountRequest;


@class LinkGameCenterAccountResult;


@class LinkGoogleAccountRequest;


@class LinkGoogleAccountResult;


@class LinkIOSDeviceIDRequest;


@class LinkIOSDeviceIDResult;


@class LinkKongregateAccountRequest;


@class LinkKongregateAccountResult;


@class LinkPSNAccountRequest;


@class LinkPSNAccountResult;


@class LinkSteamAccountRequest;


@class LinkSteamAccountResult;


@class LinkXboxAccountRequest;


@class LinkXboxAccountResult;


@class ListUsersCharactersRequest;


@class ListUsersCharactersResult;


@class LogEventRequest;


@class LogEventResult;


@class LoginResult;


@class LoginWithAndroidDeviceIDRequest;


@class LoginWithCustomIDRequest;


@class LoginWithEmailAddressRequest;


@class LoginWithFacebookRequest;


@class LoginWithGameCenterRequest;


@class LoginWithGoogleAccountRequest;


@class LoginWithIOSDeviceIDRequest;


@class LoginWithKongregateRequest;


@class LoginWithPlayFabRequest;


@class LoginWithPSNRequest;


@class LoginWithSteamRequest;


@class LoginWithXboxRequest;


@class MatchmakeRequest;


@class MatchmakeResult;



@class ModifyUserVirtualCurrencyResult;


@class OpenTradeRequest;


@class OpenTradeResponse;


@class PayForPurchaseRequest;


@class PayForPurchaseResult;


@class PaymentOption;


@class PlayerLeaderboardEntry;


@class PSNAccountPlayFabIdPair;


@class PurchaseItemRequest;


@class PurchaseItemResult;


@class RedeemCouponRequest;


@class RedeemCouponResult;


@class RefreshPSNAuthTokenRequest;



@class RegionInfo;


@class RegisterForIOSPushNotificationRequest;


@class RegisterForIOSPushNotificationResult;


@class RegisterPlayFabUserRequest;


@class RegisterPlayFabUserResult;


@class RemoveFriendRequest;


@class RemoveFriendResult;


@class RemoveSharedGroupMembersRequest;


@class RemoveSharedGroupMembersResult;


@class ReportPlayerClientRequest;


@class ReportPlayerClientResult;


@class RestoreIOSPurchasesRequest;


@class RestoreIOSPurchasesResult;


@class RunCloudScriptRequest;


@class RunCloudScriptResult;


@class SendAccountRecoveryEmailRequest;


@class SendAccountRecoveryEmailResult;


@class SetFriendTagsRequest;


@class SetFriendTagsResult;


@class SharedGroupDataRecord;


@class StartGameRequest;


@class StartGameResult;


@class StartPurchaseRequest;


@class StartPurchaseResult;


@class StatisticUpdate;


@class StatisticValue;


@class SteamPlayFabIdPair;


@class StoreItem;


@class SubtractUserVirtualCurrencyRequest;



@class TitleNewsItem;


@class TradeInfo;




@class UnlinkAndroidDeviceIDRequest;


@class UnlinkAndroidDeviceIDResult;


@class UnlinkCustomIDRequest;


@class UnlinkCustomIDResult;


@class UnlinkFacebookAccountRequest;


@class UnlinkFacebookAccountResult;


@class UnlinkGameCenterAccountRequest;


@class UnlinkGameCenterAccountResult;


@class UnlinkGoogleAccountRequest;


@class UnlinkGoogleAccountResult;


@class UnlinkIOSDeviceIDRequest;


@class UnlinkIOSDeviceIDResult;


@class UnlinkKongregateAccountRequest;


@class UnlinkKongregateAccountResult;


@class UnlinkPSNAccountRequest;


@class UnlinkPSNAccountResult;


@class UnlinkSteamAccountRequest;


@class UnlinkSteamAccountResult;


@class UnlinkXboxAccountRequest;


@class UnlinkXboxAccountResult;


@class UnlockContainerInstanceRequest;


@class UnlockContainerItemRequest;


@class UnlockContainerItemResult;


@class UpdateCharacterDataRequest;


@class UpdateCharacterDataResult;


@class UpdateCharacterStatisticsRequest;


@class UpdateCharacterStatisticsResult;


@class UpdatePlayerStatisticsRequest;


@class UpdatePlayerStatisticsResult;


@class UpdateSharedGroupDataRequest;


@class UpdateSharedGroupDataResult;


@class UpdateUserDataRequest;


@class UpdateUserDataResult;


@class UpdateUserStatisticsRequest;


@class UpdateUserStatisticsResult;


@class UpdateUserTitleDisplayNameRequest;


@class UpdateUserTitleDisplayNameResult;


@class UserAccountInfo;


@class UserAndroidDeviceInfo;


@class UserCustomIdInfo;



@class UserDataRecord;


@class UserFacebookInfo;


@class UserGameCenterInfo;


@class UserGoogleInfo;


@class UserIosDeviceInfo;


@class UserKongregateInfo;



@class UserPrivateAccountInfo;


@class UserPsnInfo;


@class UserSettings;


@class UserSteamInfo;


@class UserTitleInfo;


@class UserXboxInfo;


@class ValidateAmazonReceiptRequest;


@class ValidateAmazonReceiptResult;


@class ValidateGooglePlayPurchaseRequest;


@class ValidateGooglePlayPurchaseResult;


@class ValidateIOSReceiptRequest;


@class ValidateIOSReceiptResult;


@class VirtualCurrencyRechargeTime;






@interface AcceptTradeRequest : PlayFabBaseModel


/// <summary>
/// Player who opened trade.
/// </summary>
@property NSString* OfferingPlayerId; 

/// <summary>
/// Trade identifier.
/// </summary>
@property NSString* TradeId; 

/// <summary>
/// Items from the accepting player's inventory in exchange for the offered items in the trade. In the case of a gift, this will be null.
/// </summary>
@property NSArray* AcceptedInventoryInstanceIds; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AcceptTradeResponse : PlayFabBaseModel


/// <summary>
/// Details about trade which was just accepted.
/// </summary>
@property TradeInfo* Trade; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddFriendRequest : PlayFabBaseModel


/// <summary>
/// PlayFab identifier of the user to attempt to add to the local user's friend list.
/// </summary>
@property NSString* FriendPlayFabId; 

/// <summary>
/// PlayFab username of the user to attempt to add to the local user's friend list.
/// </summary>
@property NSString* FriendUsername; 

/// <summary>
/// Email address of the user to attempt to add to the local user's friend list.
/// </summary>
@property NSString* FriendEmail; 

/// <summary>
/// Title-specific display name of the user to attempt to add to the local user's friend list.
/// </summary>
@property NSString* FriendTitleDisplayName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddFriendResult : PlayFabBaseModel


/// <summary>
/// True if the friend request was processed successfully.
/// </summary>
@property bool Created; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddSharedGroupMembersRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the shared group.
/// </summary>
@property NSString* SharedGroupId; 

/// <summary>
/// An array of unique PlayFab assigned ID of the user on whom the operation will be performed.
/// </summary>
@property NSArray* PlayFabIds; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddSharedGroupMembersResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddUsernamePasswordRequest : PlayFabBaseModel


/// <summary>
/// PlayFab username for the account (3-20 characters)
/// </summary>
@property NSString* Username; 

/// <summary>
/// User email address attached to their account
/// </summary>
@property NSString* Email; 

/// <summary>
/// Password for the PlayFab account (6-30 characters)
/// </summary>
@property NSString* Password; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddUsernamePasswordResult : PlayFabBaseModel


/// <summary>
/// PlayFab unique user name.
/// </summary>
@property NSString* Username; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AddUserVirtualCurrencyRequest : PlayFabBaseModel


/// <summary>
/// Name of the virtual currency which is to be incremented.
/// </summary>
@property NSString* VirtualCurrency; 

/// <summary>
/// Amount to be added to the user balance of the specified virtual currency.
/// </summary>
@property NSNumber* Amount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AndroidDevicePushNotificationRegistrationRequest : PlayFabBaseModel


/// <summary>
/// Registration ID provided by the Google Cloud Messaging service when the title registered to receive push notifications (see the GCM documentation, here: http://developer.android.com/google/gcm/client.html).
/// </summary>
@property NSString* DeviceToken; 

/// <summary>
/// If true, send a test push message immediately after sucessful registration. Defaults to false.
/// </summary>
@property bool SendPushNotificationConfirmation; 

/// <summary>
/// Message to display when confirming push notification.
/// </summary>
@property NSString* ConfirmationMessege; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AndroidDevicePushNotificationRegistrationResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AttributeInstallRequest : PlayFabBaseModel


/// <summary>
/// The IdentifierForAdvertisers for iOS Devices.
/// </summary>
@property NSString* Idfa; 

/// <summary>
/// The Android Id for this Android device.
/// </summary>
@property NSString* Android_Id; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface AttributeInstallResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CancelTradeRequest : PlayFabBaseModel


/// <summary>
/// Trade identifier.
/// </summary>
@property NSString* TradeId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CancelTradeResponse : PlayFabBaseModel


/// <summary>
/// Details about trade which was just canceled.
/// </summary>
@property TradeInfo* Trade; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CartItem : PlayFabBaseModel


/// <summary>
/// Unique identifier for the catalog item.
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// Class name to which catalog item belongs.
/// </summary>
@property NSString* ItemClass; 

/// <summary>
/// Unique instance identifier for this catalog item.
/// </summary>
@property NSString* ItemInstanceId; 

/// <summary>
/// Display name for the catalog item.
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// Description of the catalog item.
/// </summary>
@property NSString* Description; 

/// <summary>
/// Cost of the catalog item for each applicable virtual currency.
/// </summary>
@property NSDictionary* VirtualCurrencyPrices; 

/// <summary>
/// Cost of the catalog item for each applicable real world currency.
/// </summary>
@property NSDictionary* RealCurrencyPrices; 

/// <summary>
/// Amount of each applicable virtual currency which will be received as a result of purchasing this catalog item.
/// </summary>
@property NSDictionary* VCAmount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


/// <summary>
/// A purchasable item from the item catalog
/// </summary>
@interface CatalogItem : PlayFabBaseModel


/// <summary>
/// unique identifier for this item
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// class to which the item belongs
/// </summary>
@property NSString* ItemClass; 

/// <summary>
/// catalog version for this item
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// text name for the item, to show in-game
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// text description of item, to show in-game
/// </summary>
@property NSString* Description; 

/// <summary>
/// price of this item in virtual currencies and "RM" (the base Real Money purchase price, in USD pennies)
/// </summary>
@property NSDictionary* VirtualCurrencyPrices; 

/// <summary>
/// override prices for this item for specific currencies
/// </summary>
@property NSDictionary* RealCurrencyPrices; 

/// <summary>
/// list of item tags
/// </summary>
@property NSArray* Tags; 

/// <summary>
/// game specific custom data
/// </summary>
@property NSString* CustomData; 

/// <summary>
/// defines the consumable properties (number of uses, timeout) for the item
/// </summary>
@property CatalogItemConsumableInfo* Consumable; 

/// <summary>
/// defines the container properties for the item - what items it contains, including random drop tables and virtual currencies, and what item (if any) is required to open it via the UnlockContainerItem API
/// </summary>
@property CatalogItemContainerInfo* Container; 

/// <summary>
/// defines the bundle properties for the item - bundles are items which contain other items, including random drop tables and virtual currencies
/// </summary>
@property CatalogItemBundleInfo* Bundle; 

/// <summary>
/// if true, then an item instance of this type can be used to grant a character to a user.
/// </summary>
@property bool CanBecomeCharacter; 

/// <summary>
/// if true, then only one item instance of this type will exist and its remaininguses will be incremented instead. RemainingUses will cap out at Int32.Max (2,147,483,647). All subsequent increases will be discarded
/// </summary>
@property bool IsStackable; 

/// <summary>
/// if true, then an item instance of this type can be traded between players using the trading APIs
/// </summary>
@property bool IsTradable; 

/// <summary>
/// URL to the item image. For Facebook purchase to display the image on the item purchase page, this must be set to an HTTP URL.
/// </summary>
@property NSString* ItemImageUrl; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CatalogItemBundleInfo : PlayFabBaseModel


/// <summary>
/// unique ItemId values for all items which will be added to the player inventory when the bundle is added
/// </summary>
@property NSArray* BundledItems; 

/// <summary>
/// unique TableId values for all RandomResultTable objects which are part of the bundle (random tables will be resolved and add the relevant items to the player inventory when the bundle is added)
/// </summary>
@property NSArray* BundledResultTables; 

/// <summary>
/// virtual currency types and balances which will be added to the player inventory when the bundle is added
/// </summary>
@property NSDictionary* BundledVirtualCurrencies; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CatalogItemConsumableInfo : PlayFabBaseModel


/// <summary>
/// number of times this object can be used, after which it will be removed from the player inventory
/// </summary>
@property NSNumber* UsageCount; 

/// <summary>
/// duration in seconds for how long the item will remain in the player inventory - once elapsed, the item will be removed
/// </summary>
@property NSNumber* UsagePeriod; 

/// <summary>
/// all inventory item instances in the player inventory sharing a non-null UsagePeriodGroup have their UsagePeriod values added together, and share the result - when that period has elapsed, all the items in the group will be removed
/// </summary>
@property NSString* UsagePeriodGroup; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


/// <summary>
/// Containers are inventory items that can hold other items defined in the catalog, as well as virtual currency, which is added to the player inventory when the container is unlocked, using the UnlockContainerItem API. The items can be anything defined in the catalog, as well as RandomResultTable objects which will be resolved when the container is unlocked. Containers and their keys should be defined as Consumable (having a limited number of uses) in their catalog defintiions, unless the intent is for the player to be able to re-use them infinitely.
/// </summary>
@interface CatalogItemContainerInfo : PlayFabBaseModel


/// <summary>
/// ItemId for the catalog item used to unlock the container, if any (if not specified, a call to UnlockContainerItem will open the container, adding the contents to the player inventory and currency balances)
/// </summary>
@property NSString* KeyItemId; 

/// <summary>
/// unique ItemId values for all items which will be added to the player inventory, once the container has been unlocked
/// </summary>
@property NSArray* ItemContents; 

/// <summary>
/// unique TableId values for all RandomResultTable objects which are part of the container (once unlocked, random tables will be resolved and add the relevant items to the player inventory)
/// </summary>
@property NSArray* ResultTableContents; 

/// <summary>
/// virtual currency types and balances which will be added to the player inventory when the container is unlocked
/// </summary>
@property NSDictionary* VirtualCurrencyContents; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CharacterLeaderboardEntry : PlayFabBaseModel


/// <summary>
/// PlayFab unique identifier of the user for this leaderboard entry.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// PlayFab unique identifier of the character that belongs to the user for this leaderboard entry.
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Title-specific display name of the character for this leaderboard entry.
/// </summary>
@property NSString* CharacterName; 

/// <summary>
/// Title-specific display name of the user for this leaderboard entry.
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// Name of the character class for this entry.
/// </summary>
@property NSString* CharacterType; 

/// <summary>
/// Specific value of the user's statistic.
/// </summary>
@property NSNumber* StatValue; 

/// <summary>
/// User's overall position in the leaderboard.
/// </summary>
@property NSNumber* Position; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CharacterResult : PlayFabBaseModel


/// <summary>
/// The id for this character on this player.
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// The name of this character.
/// </summary>
@property NSString* CharacterName; 

/// <summary>
/// The type-string that was given to this character on creation.
/// </summary>
@property NSString* CharacterType; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ConfirmPurchaseRequest : PlayFabBaseModel


/// <summary>
/// Purchase order identifier returned from StartPurchase.
/// </summary>
@property NSString* OrderId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ConfirmPurchaseResult : PlayFabBaseModel


/// <summary>
/// Purchase order identifier.
/// </summary>
@property NSString* OrderId; 

/// <summary>
/// Date and time of the purchase.
/// </summary>
@property NSDate* PurchaseDate; 

/// <summary>
/// Array of items purchased.
/// </summary>
@property NSArray* Items; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ConsumeItemRequest : PlayFabBaseModel


/// <summary>
/// Unique instance identifier of the item to be consumed.
/// </summary>
@property NSString* ItemInstanceId; 

/// <summary>
/// Number of uses to consume from the item.
/// </summary>
@property NSNumber* ConsumeCount; 

/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ConsumeItemResult : PlayFabBaseModel


/// <summary>
/// Unique instance identifier of the item with uses consumed.
/// </summary>
@property NSString* ItemInstanceId; 

/// <summary>
/// Number of uses remaining on the item.
/// </summary>
@property NSNumber* RemainingUses; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ConsumePSNEntitlementsRequest : PlayFabBaseModel


/// <summary>
/// Which catalog to match granted entitlements against. If null, defaults to title default catalog
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Id of the PSN service label to consume entitlements from
/// </summary>
@property NSNumber* ServiceLabel; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ConsumePSNEntitlementsResult : PlayFabBaseModel


/// <summary>
/// Array of items granted to the player as a result of consuming entitlements.
/// </summary>
@property NSArray* ItemsGranted; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CreateSharedGroupRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the shared group (a random identifier will be assigned, if one is not specified).
/// </summary>
@property NSString* SharedGroupId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CreateSharedGroupResult : PlayFabBaseModel


/// <summary>
/// Unique identifier for the shared group.
/// </summary>
@property NSString* SharedGroupId; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CurrentGamesRequest : PlayFabBaseModel


/// <summary>
/// region to check for game instances
/// </summary>
@property Region pfRegion; 

/// <summary>
/// version of build to match against
/// </summary>
@property NSString* BuildVersion; 

/// <summary>
/// game mode to look for (optional)
/// </summary>
@property NSString* GameMode; 

/// <summary>
/// statistic name to find statistic-based matches (optional)
/// </summary>
@property NSString* StatisticName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface CurrentGamesResult : PlayFabBaseModel


/// <summary>
/// array of games found
/// </summary>
@property NSArray* Games; 

/// <summary>
/// total number of players across all servers
/// </summary>
@property NSNumber* PlayerCount; 

/// <summary>
/// number of games running
/// </summary>
@property NSNumber* GameCount; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface EmptyResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface FacebookPlayFabIdPair : PlayFabBaseModel


/// <summary>
/// Unique Facebook identifier for a user.
/// </summary>
@property NSString* FacebookId; 

/// <summary>
/// Unique PlayFab identifier for a user, or null if no PlayFab account is linked to the Facebook identifier.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface FriendInfo : PlayFabBaseModel


/// <summary>
/// PlayFab unique identifier for this friend.
/// </summary>
@property NSString* FriendPlayFabId; 

/// <summary>
/// PlayFab unique username for this friend.
/// </summary>
@property NSString* Username; 

/// <summary>
/// Title-specific display name for this friend.
/// </summary>
@property NSString* TitleDisplayName; 

/// <summary>
/// Tags which have been associated with this friend.
/// </summary>
@property NSArray* Tags; 

/// <summary>
/// Unique lobby identifier of the Game Server Instance to which this player is currently connected.
/// </summary>
@property NSString* CurrentMatchmakerLobbyId; 

/// <summary>
/// Available Facebook information (if the user and PlayFab friend are also connected in Facebook).
/// </summary>
@property UserFacebookInfo* FacebookInfo; 

/// <summary>
/// Available Steam information (if the user and PlayFab friend are also connected in Steam).
/// </summary>
@property UserSteamInfo* SteamInfo; 

/// <summary>
/// Available Game Center information (if the user and PlayFab friend are also connected in Game Center).
/// </summary>
@property UserGameCenterInfo* GameCenterInfo; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GameCenterPlayFabIdPair : PlayFabBaseModel


/// <summary>
/// Unique Game Center identifier for a user.
/// </summary>
@property NSString* GameCenterId; 

/// <summary>
/// Unique PlayFab identifier for a user, or null if no PlayFab account is linked to the Game Center identifier.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GameInfo : PlayFabBaseModel


/// <summary>
/// region to which this server is associated
/// </summary>
@property Region pfRegion; 

/// <summary>
/// unique lobby identifier for this game server
/// </summary>
@property NSString* LobbyID; 

/// <summary>
/// build version this server is running
/// </summary>
@property NSString* BuildVersion; 

/// <summary>
/// game mode this server is running
/// </summary>
@property NSString* GameMode; 

/// <summary>
/// stastic used to match this game in player statistic matchmaking
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// maximum players this server can support
/// </summary>
@property NSNumber* MaxPlayers; 

/// <summary>
/// array of strings of current player names on this server (note that these are PlayFab usernames, as opposed to title display names)
/// </summary>
@property NSArray* PlayerUserIds; 

/// <summary>
/// duration in seconds this server has been running
/// </summary>
@property NSNumber* RunTime; 

/// <summary>
/// game specific string denoting server configuration
/// </summary>
@property NSString* GameServerState; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GameServerRegionsRequest : PlayFabBaseModel


/// <summary>
/// version of game server for which stats are being requested
/// </summary>
@property NSString* BuildVersion; 

/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GameServerRegionsResult : PlayFabBaseModel


/// <summary>
/// array of regions found matching the request parameters
/// </summary>
@property NSArray* Regions; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetAccountInfoRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab identifier of the user whose info is being requested. Optional, defaults to the authenticated user if no other lookup identifier set.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// PlayFab Username for the account to find (if no PlayFabId is specified).
/// </summary>
@property NSString* Username; 

/// <summary>
/// User email address for the account to find (if no Username is specified).
/// </summary>
@property NSString* Email; 

/// <summary>
/// Title-specific username for the account to find (if no Email is set).
/// </summary>
@property NSString* TitleDisplayName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetAccountInfoResult : PlayFabBaseModel


/// <summary>
/// Account information for the local user.
/// </summary>
@property UserAccountInfo* AccountInfo; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCatalogItemsRequest : PlayFabBaseModel


/// <summary>
/// Which catalog is being requested.
/// </summary>
@property NSString* CatalogVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCatalogItemsResult : PlayFabBaseModel


/// <summary>
/// Array of inventory objects.
/// </summary>
@property NSArray* Catalog; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterDataRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab identifier of the user to load data for. Optional, defaults to yourself if not set.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Specific keys to search for in the custom user data.
/// </summary>
@property NSArray* Keys; 

/// <summary>
/// The version that currently exists according to the caller. The call will return the data for all of the keys if the version in the system is greater than this.
/// </summary>
@property NSNumber* IfChangedFromDataVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterDataResult : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// User specific data for this title.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// Indicates the current version of the data that has been set. This is incremented with every set call for that type of data (read-only, internal, etc). This version can be provided in Get calls to find updated data.
/// </summary>
@property NSNumber* DataVersion; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterInventoryRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID of the user on whom the operation will be performed.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Used to limit results to only those from a specific catalog version.
/// </summary>
@property NSString* CatalogVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterInventoryResult : PlayFabBaseModel


/// <summary>
/// PlayFab unique identifier of the user whose character inventory is being returned.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Unique identifier of the character for this inventory.
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Array of inventory items belonging to the character.
/// </summary>
@property NSArray* Inventory; 

/// <summary>
/// Array of virtual currency balance(s) belonging to the character.
/// </summary>
@property NSDictionary* VirtualCurrency; 

/// <summary>
/// Array of remaining times and timestamps for virtual currencies.
/// </summary>
@property NSDictionary* VirtualCurrencyRechargeTimes; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterLeaderboardRequest : PlayFabBaseModel


/// <summary>
/// Optional character type on which to filter the leaderboard entries.
/// </summary>
@property NSString* CharacterType; 

/// <summary>
/// Unique identifier for the title-specific statistic for the leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// First entry in the leaderboard to be retrieved.
/// </summary>
@property NSNumber* StartPosition; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterLeaderboardResult : PlayFabBaseModel


/// <summary>
/// Ordered list of leaderboard entries.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterStatisticsRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCharacterStatisticsResult : PlayFabBaseModel


/// <summary>
/// The requested character statistics.
/// </summary>
@property NSDictionary* CharacterStatistics; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCloudScriptUrlRequest : PlayFabBaseModel


/// <summary>
/// Cloud Script Version to use. Defaults to 1.
/// </summary>
@property NSNumber* Version; 

/// <summary>
/// Specifies whether the URL returned should be the one for the most recently uploaded Revision of the Cloud Script (true), or the Revision most recently set to live (false). Defaults to false.
/// </summary>
@property bool Testing; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetCloudScriptUrlResult : PlayFabBaseModel


/// <summary>
/// URL of the Cloud Script logic server.
/// </summary>
@property NSString* Url; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetContentDownloadUrlRequest : PlayFabBaseModel


/// <summary>
/// Key of the content item to fetch, usually formatted as a path, e.g. images/a.png
/// </summary>
@property NSString* Key; 

/// <summary>
/// HTTP method to fetch item - GET or HEAD. Use HEAD when only fetching metadata. Default is GET.
/// </summary>
@property NSString* HttpMethod; 

/// <summary>
/// True if download through CDN. CDN provides better download bandwidth and time. However, if you want latest, non-cached version of the content, set this to false. Default is true.
/// </summary>
@property bool ThruCDN; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetContentDownloadUrlResult : PlayFabBaseModel


/// <summary>
/// URL for downloading content via HTTP GET or HEAD method. The URL will expire in 1 hour.
/// </summary>
@property NSString* URL; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendLeaderboardAroundCurrentUserRequest : PlayFabBaseModel


/// <summary>
/// Statistic used to rank players for this leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/// <summary>
/// Indicates whether Steam service friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeSteamFriends; 

/// <summary>
/// Indicates whether Facebook friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeFacebookFriends; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendLeaderboardAroundCurrentUserResult : PlayFabBaseModel


/// <summary>
/// Ordered listing of users and their positions in the requested leaderboard.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendLeaderboardAroundPlayerRequest : PlayFabBaseModel


/// <summary>
/// Statistic used to rank players for this leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/// <summary>
/// PlayFab unique identifier of the user to center the leaderboard around. If null will center on the logged in user.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Indicates whether Steam service friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeSteamFriends; 

/// <summary>
/// Indicates whether Facebook friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeFacebookFriends; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendLeaderboardAroundPlayerResult : PlayFabBaseModel


/// <summary>
/// Ordered listing of users and their positions in the requested leaderboard.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendLeaderboardRequest : PlayFabBaseModel


/// <summary>
/// Statistic used to rank friends for this leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Position in the leaderboard to start this listing (defaults to the first entry).
/// </summary>
@property NSNumber* StartPosition; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/// <summary>
/// Indicates whether Steam service friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeSteamFriends; 

/// <summary>
/// Indicates whether Facebook friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeFacebookFriends; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendsListRequest : PlayFabBaseModel


/// <summary>
/// Indicates whether Steam service friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeSteamFriends; 

/// <summary>
/// Indicates whether Facebook friends should be included in the response. Default is true.
/// </summary>
@property bool IncludeFacebookFriends; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetFriendsListResult : PlayFabBaseModel


/// <summary>
/// Array of friends found.
/// </summary>
@property NSArray* Friends; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardAroundCharacterRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title-specific statistic for the leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Unique PlayFab assigned ID for a specific character on which to center the leaderboard.
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Optional character type on which to filter the leaderboard entries.
/// </summary>
@property NSString* CharacterType; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardAroundCharacterResult : PlayFabBaseModel


/// <summary>
/// Ordered list of leaderboard entries.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardAroundCurrentUserRequest : PlayFabBaseModel


/// <summary>
/// Statistic used to rank players for this leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardAroundCurrentUserResult : PlayFabBaseModel


/// <summary>
/// Ordered listing of users and their positions in the requested leaderboard.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardAroundPlayerRequest : PlayFabBaseModel


/// <summary>
/// PlayFab unique identifier of the user to center the leaderboard around. If null will center on the logged in user.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Statistic used to rank players for this leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardAroundPlayerResult : PlayFabBaseModel


/// <summary>
/// Ordered listing of users and their positions in the requested leaderboard.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardForUsersCharactersRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title-specific statistic for the leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Maximum number of entries to retrieve.
/// </summary>
@property NSNumber* MaxResultsCount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardForUsersCharactersResult : PlayFabBaseModel


/// <summary>
/// Ordered list of leaderboard entries.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardRequest : PlayFabBaseModel


/// <summary>
/// Statistic used to rank players for this leaderboard.
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// Position in the leaderboard to start this listing (defaults to the first entry).
/// </summary>
@property NSNumber* StartPosition; 

/// <summary>
/// Maximum number of entries to retrieve. Default 10, maximum 100.
/// </summary>
@property NSNumber* MaxResultsCount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetLeaderboardResult : PlayFabBaseModel


/// <summary>
/// Ordered listing of users and their positions in the requested leaderboard.
/// </summary>
@property NSArray* Leaderboard; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPhotonAuthenticationTokenRequest : PlayFabBaseModel


/// <summary>
/// The Photon applicationId for the game you wish to log into.
/// </summary>
@property NSString* PhotonApplicationId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPhotonAuthenticationTokenResult : PlayFabBaseModel


/// <summary>
/// The Photon authentication token for this game-session.
/// </summary>
@property NSString* PhotonCustomAuthenticationToken; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayerStatisticsRequest : PlayFabBaseModel


/// <summary>
/// statistics to return
/// </summary>
@property NSArray* StatisticNames; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayerStatisticsResult : PlayFabBaseModel


/// <summary>
/// User statistics for the requested user.
/// </summary>
@property NSArray* Statistics; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayerTradesRequest : PlayFabBaseModel


/// <summary>
/// Returns only trades with the given status. If null, returns all trades.
/// </summary>
@property TradeStatus StatusFilter; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayerTradesResponse : PlayFabBaseModel


/// <summary>
/// The trades for this player which are currently available to be accepted.
/// </summary>
@property NSArray* OpenedTrades; 

/// <summary>
/// History of trades which this player has accepted.
/// </summary>
@property NSArray* AcceptedTrades; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromFacebookIDsRequest : PlayFabBaseModel


/// <summary>
/// Array of unique Facebook identifiers for which the title needs to get PlayFab identifiers.
/// </summary>
@property NSArray* FacebookIDs; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromFacebookIDsResult : PlayFabBaseModel


/// <summary>
/// Mapping of Facebook identifiers to PlayFab identifiers.
/// </summary>
@property NSArray* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromGameCenterIDsRequest : PlayFabBaseModel


/// <summary>
/// Array of unique Game Center identifiers (the Player Identifier) for which the title needs to get PlayFab identifiers.
/// </summary>
@property NSArray* GameCenterIDs; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromGameCenterIDsResult : PlayFabBaseModel


/// <summary>
/// Mapping of Game Center identifiers to PlayFab identifiers.
/// </summary>
@property NSArray* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromGoogleIDsRequest : PlayFabBaseModel


/// <summary>
/// Array of unique Google identifiers (Google+ user IDs) for which the title needs to get PlayFab identifiers.
/// </summary>
@property NSArray* GoogleIDs; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromGoogleIDsResult : PlayFabBaseModel


/// <summary>
/// Mapping of Google identifiers to PlayFab identifiers.
/// </summary>
@property NSArray* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromKongregateIDsRequest : PlayFabBaseModel


/// <summary>
/// Array of unique Kongregate identifiers (Kongregate's user_id) for which the title needs to get PlayFab identifiers.
/// </summary>
@property NSArray* KongregateIDs; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromKongregateIDsResult : PlayFabBaseModel


/// <summary>
/// Mapping of Kongregate identifiers to PlayFab identifiers.
/// </summary>
@property NSArray* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromPSNAccountIDsRequest : PlayFabBaseModel


/// <summary>
/// Array of unique PlayStation Network identifiers for which the title needs to get PlayFab identifiers.
/// </summary>
@property NSArray* PSNAccountIDs; 

/// <summary>
/// Id of the PSN issuer environment. If null, defaults to 256 (production)
/// </summary>
@property NSNumber* IssuerId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromPSNAccountIDsResult : PlayFabBaseModel


/// <summary>
/// Mapping of PlayStation Network identifiers to PlayFab identifiers.
/// </summary>
@property NSArray* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromSteamIDsRequest : PlayFabBaseModel


/// <summary>
/// Deprecated: Please use SteamStringIDs
/// </summary>
@property NSArray* SteamIDs; 

/// <summary>
/// Array of unique Steam identifiers (Steam profile IDs) for which the title needs to get PlayFab identifiers.
/// </summary>
@property NSArray* SteamStringIDs; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPlayFabIDsFromSteamIDsResult : PlayFabBaseModel


/// <summary>
/// Mapping of Steam identifiers to PlayFab identifiers.
/// </summary>
@property NSArray* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPublisherDataRequest : PlayFabBaseModel


/// <summary>
///  array of keys to get back data from the Publisher data blob, set by the admin tools
/// </summary>
@property NSArray* Keys; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPublisherDataResult : PlayFabBaseModel


/// <summary>
/// a dictionary object of key / value pairs
/// </summary>
@property NSDictionary* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPurchaseRequest : PlayFabBaseModel


/// <summary>
/// Purchase order identifier.
/// </summary>
@property NSString* OrderId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetPurchaseResult : PlayFabBaseModel


/// <summary>
/// Purchase order identifier.
/// </summary>
@property NSString* OrderId; 

/// <summary>
/// Payment provider used for transaction (If not VC)
/// </summary>
@property NSString* PaymentProvider; 

/// <summary>
/// Provider transaction ID (If not VC)
/// </summary>
@property NSString* TransactionId; 

/// <summary>
/// PlayFab transaction status
/// </summary>
@property NSString* TransactionStatus; 

/// <summary>
/// Date and time of the purchase.
/// </summary>
@property NSDate* PurchaseDate; 

/// <summary>
/// Array of items purchased.
/// </summary>
@property NSArray* Items; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetSharedGroupDataRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the shared group.
/// </summary>
@property NSString* SharedGroupId; 

/// <summary>
/// Specific keys to retrieve from the shared group (if not specified, all keys will be returned, while an empty array indicates that no keys should be returned).
/// </summary>
@property NSArray* Keys; 

/// <summary>
/// If true, return the list of all members of the shared group.
/// </summary>
@property bool GetMembers; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetSharedGroupDataResult : PlayFabBaseModel


/// <summary>
/// Data for the requested keys.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// List of PlayFabId identifiers for the members of this group, if requested.
/// </summary>
@property NSArray* Members; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetStoreItemsRequest : PlayFabBaseModel


/// <summary>
/// Unqiue identifier for the store which is being requested.
/// </summary>
@property NSString* StoreId; 

/// <summary>
/// Catalog version for the requested store items. If null, defaults to most recent catalog.
/// </summary>
@property NSString* CatalogVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetStoreItemsResult : PlayFabBaseModel


/// <summary>
/// Array of store items.
/// </summary>
@property NSArray* Store; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetTitleDataRequest : PlayFabBaseModel


/// <summary>
/// Specific keys to search for in the title data (leave null to get all keys)
/// </summary>
@property NSArray* Keys; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetTitleDataResult : PlayFabBaseModel


/// <summary>
/// a dictionary object of key / value pairs
/// </summary>
@property NSDictionary* Data; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetTitleNewsRequest : PlayFabBaseModel


/// <summary>
/// Limits the results to the last n entries. Defaults to 10 if not set.
/// </summary>
@property NSNumber* Count; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetTitleNewsResult : PlayFabBaseModel


/// <summary>
/// Array of news items.
/// </summary>
@property NSArray* News; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetTradeStatusRequest : PlayFabBaseModel


/// <summary>
/// Player who opened trade.
/// </summary>
@property NSString* OfferingPlayerId; 

/// <summary>
/// Trade identifier as returned by OpenTradeOffer.
/// </summary>
@property NSString* TradeId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetTradeStatusResponse : PlayFabBaseModel


/// <summary>
/// Information about the requested trade.
/// </summary>
@property TradeInfo* Trade; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserCombinedInfoRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab identifier of the user whose info is being requested. Optional, defaults to the authenticated user if no other lookup identifier set.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// PlayFab Username for the account to find (if no PlayFabId is specified).
/// </summary>
@property NSString* Username; 

/// <summary>
/// User email address for the account to find (if no Username is specified).
/// </summary>
@property NSString* Email; 

/// <summary>
/// Title-specific username for the account to find (if no Email is set).
/// </summary>
@property NSString* TitleDisplayName; 

/// <summary>
/// If set to false, account info will not be returned. Defaults to true.
/// </summary>
@property bool GetAccountInfo; 

/// <summary>
/// If set to false, inventory will not be returned. Defaults to true. Inventory will never be returned for users other than yourself.
/// </summary>
@property bool GetInventory; 

/// <summary>
/// If set to false, virtual currency balances will not be returned. Defaults to true. Currency balances will never be returned for users other than yourself.
/// </summary>
@property bool GetVirtualCurrency; 

/// <summary>
/// If set to false, custom user data will not be returned. Defaults to true.
/// </summary>
@property bool GetUserData; 

/// <summary>
/// User custom data keys to return. If set to null, all keys will be returned. For users other than yourself, only public data will be returned.
/// </summary>
@property NSArray* UserDataKeys; 

/// <summary>
/// If set to false, read-only user data will not be returned. Defaults to true.
/// </summary>
@property bool GetReadOnlyData; 

/// <summary>
/// User read-only custom data keys to return. If set to null, all keys will be returned. For users other than yourself, only public data will be returned.
/// </summary>
@property NSArray* ReadOnlyDataKeys; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserCombinedInfoResult : PlayFabBaseModel


/// <summary>
/// Unique PlayFab identifier of the owner of the combined info.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Account information for the user.
/// </summary>
@property UserAccountInfo* AccountInfo; 

/// <summary>
/// Array of inventory items in the user's current inventory.
/// </summary>
@property NSArray* Inventory; 

/// <summary>
/// Array of virtual currency balance(s) belonging to the user.
/// </summary>
@property NSDictionary* VirtualCurrency; 

/// <summary>
/// Array of remaining times and timestamps for virtual currencies.
/// </summary>
@property NSDictionary* VirtualCurrencyRechargeTimes; 

/// <summary>
/// User specific custom data.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// The version of the UserData that was returned.
/// </summary>
@property NSNumber* DataVersion; 

/// <summary>
/// User specific read-only data.
/// </summary>
@property NSDictionary* ReadOnlyData; 

/// <summary>
/// The version of the Read-Only UserData that was returned.
/// </summary>
@property NSNumber* ReadOnlyDataVersion; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserDataRequest : PlayFabBaseModel


/// <summary>
/// Specific keys to search for in the custom data. Leave null to get all keys.
/// </summary>
@property NSArray* Keys; 

/// <summary>
/// Unique PlayFab identifier of the user to load data for. Optional, defaults to yourself if not set.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// The version that currently exists according to the caller. The call will return the data for all of the keys if the version in the system is greater than this.
/// </summary>
@property NSNumber* IfChangedFromDataVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserDataResult : PlayFabBaseModel


/// <summary>
/// User specific data for this title.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// Indicates the current version of the data that has been set. This is incremented with every set call for that type of data (read-only, internal, etc). This version can be provided in Get calls to find updated data.
/// </summary>
@property NSNumber* DataVersion; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserInventoryRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserInventoryResult : PlayFabBaseModel


/// <summary>
/// Array of inventory items in the user's current inventory.
/// </summary>
@property NSArray* Inventory; 

/// <summary>
/// Array of virtual currency balance(s) belonging to the user.
/// </summary>
@property NSDictionary* VirtualCurrency; 

/// <summary>
/// Array of remaining times and timestamps for virtual currencies.
/// </summary>
@property NSDictionary* VirtualCurrencyRechargeTimes; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserStatisticsRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GetUserStatisticsResult : PlayFabBaseModel


/// <summary>
/// User statistics for the active title.
/// </summary>
@property NSDictionary* UserStatistics; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GooglePlayFabIdPair : PlayFabBaseModel


/// <summary>
/// Unique Google identifier for a user.
/// </summary>
@property NSString* GoogleId; 

/// <summary>
/// Unique PlayFab identifier for a user, or null if no PlayFab account is linked to the Google identifier.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GrantCharacterToUserRequest : PlayFabBaseModel


/// <summary>
/// Catalog version from which items are to be granted.
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Catalog item identifier of the item in the user's inventory that corresponds to the character in the catalog to be created.
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// Non-unique display name of the character being granted.
/// </summary>
@property NSString* CharacterName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface GrantCharacterToUserResult : PlayFabBaseModel


/// <summary>
/// Unique identifier tagged to this character.
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Type of character that was created.
/// </summary>
@property NSString* CharacterType; 

/// <summary>
/// Indicates whether this character was created successfully.
/// </summary>
@property bool Result; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


/// <summary>
/// A unique instance of an item in a user's inventory
/// </summary>
@interface ItemInstance : PlayFabBaseModel


/// <summary>
/// Unique identifier for the inventory item, as defined in the catalog.
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// Unique item identifier for this specific instance of the item.
/// </summary>
@property NSString* ItemInstanceId; 

/// <summary>
/// Class name for the inventory item, as defined in the catalog.
/// </summary>
@property NSString* ItemClass; 

/// <summary>
/// Timestamp for when this instance was purchased.
/// </summary>
@property NSDate* PurchaseDate; 

/// <summary>
/// Timestamp for when this instance will expire.
/// </summary>
@property NSDate* Expiration; 

/// <summary>
/// Total number of remaining uses, if this is a consumable item.
/// </summary>
@property NSNumber* RemainingUses; 

/// <summary>
/// The number of uses that were added or removed to this item in this call.
/// </summary>
@property NSNumber* UsesIncrementedBy; 

/// <summary>
/// Game specific comment associated with this instance when it was added to the user inventory.
/// </summary>
@property NSString* Annotation; 

/// <summary>
/// Catalog version for the inventory item, when this instance was created.
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Unique identifier for the parent inventory item, as defined in the catalog, for object which were added from a bundle or container.
/// </summary>
@property NSString* BundleParent; 

/// <summary>
/// CatalogItem.DisplayName at the time this item was purchased.
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// Currency type for the cost of the catalog item.
/// </summary>
@property NSString* UnitCurrency; 

/// <summary>
/// Cost of the catalog item in the given currency.
/// </summary>
@property NSNumber* UnitPrice; 

/// <summary>
/// Array of unique items that were awarded when this catalog item was purchased.
/// </summary>
@property NSArray* BundleContents; 

/// <summary>
/// A set of custom key-value pairs on the inventory item.
/// </summary>
@property NSDictionary* CustomData; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ItemPurchaseRequest : PlayFabBaseModel


/// <summary>
/// Unique ItemId of the item to purchase.
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// How many of this item to purchase.
/// </summary>
@property NSNumber* Quantity; 

/// <summary>
/// Title-specific text concerning this purchase.
/// </summary>
@property NSString* Annotation; 

/// <summary>
/// Items to be upgraded as a result of this purchase (upgraded items are hidden, as they are "replaced" by the new items).
/// </summary>
@property NSArray* UpgradeFromItems; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface KongregatePlayFabIdPair : PlayFabBaseModel


/// <summary>
/// Unique Kongregate identifier for a user.
/// </summary>
@property NSString* KongregateId; 

/// <summary>
/// Unique PlayFab identifier for a user, or null if no PlayFab account is linked to the Kongregate identifier.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkAndroidDeviceIDRequest : PlayFabBaseModel


/// <summary>
/// Android device identifier for the user's device.
/// </summary>
@property NSString* AndroidDeviceId; 

/// <summary>
/// Specific Operating System version for the user's device.
/// </summary>
@property NSString* OS; 

/// <summary>
/// Specific model of the user's device.
/// </summary>
@property NSString* AndroidDevice; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkAndroidDeviceIDResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkCustomIDRequest : PlayFabBaseModel


/// <summary>
/// Custom unique identifier for the user, generated by the title.
/// </summary>
@property NSString* CustomId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkCustomIDResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkFacebookAccountRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier from Facebook for the user.
/// </summary>
@property NSString* AccessToken; 

/// <summary>
/// If this Facebook account is already linked to a Playfab account, this will unlink the old account before linking the new one. Be careful when using this call, as it may orphan the old account. Defaults to false.
/// </summary>
@property bool ForceLink; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkFacebookAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkGameCenterAccountRequest : PlayFabBaseModel


/// <summary>
/// Game Center identifier for the player account to be linked.
/// </summary>
@property NSString* GameCenterId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkGameCenterAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkGoogleAccountRequest : PlayFabBaseModel


/// <summary>
/// Unique token from Google Play for the user.
/// </summary>
@property NSString* AccessToken; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkGoogleAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkIOSDeviceIDRequest : PlayFabBaseModel


/// <summary>
/// Vendor-specific iOS identifier for the user's device.
/// </summary>
@property NSString* DeviceId; 

/// <summary>
/// Specific Operating System version for the user's device.
/// </summary>
@property NSString* OS; 

/// <summary>
/// Specific model of the user's device.
/// </summary>
@property NSString* DeviceModel; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkIOSDeviceIDResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkKongregateAccountRequest : PlayFabBaseModel


/// <summary>
/// Numeric user ID assigned by Kongregate
/// </summary>
@property NSString* KongregateId; 

/// <summary>
/// Valid session auth ticket issued by Kongregate
/// </summary>
@property NSString* AuthTicket; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkKongregateAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkPSNAccountRequest : PlayFabBaseModel


/// <summary>
/// Authentication code provided by the PlayStation Network.
/// </summary>
@property NSString* AuthCode; 

/// <summary>
/// Redirect URI supplied to PSN when requesting an auth code
/// </summary>
@property NSString* RedirectUri; 

/// <summary>
/// Id of the PSN issuer environment. If null, defaults to 256 (production)
/// </summary>
@property NSNumber* IssuerId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkPSNAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkSteamAccountRequest : PlayFabBaseModel


/// <summary>
/// Authentication token for the user, returned as a byte array from Steam, and converted to a string (for example, the byte 0x08 should become "08").
/// </summary>
@property NSString* SteamTicket; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkSteamAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkXboxAccountRequest : PlayFabBaseModel


/// <summary>
/// Token provided by the Xbox Live SDK/XDK method GetTokenAndSignatureAsync("POST", "https://playfabapi.com", "").
/// </summary>
@property NSString* XboxToken; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LinkXboxAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ListUsersCharactersRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID of the user on whom the operation will be performed.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ListUsersCharactersResult : PlayFabBaseModel


/// <summary>
/// The requested list of characters.
/// </summary>
@property NSArray* Characters; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LogEventRequest : PlayFabBaseModel


/// <summary>
/// Optional timestamp for this event. If null, the a timestamp is auto-assigned to the event on the server.
/// </summary>
@property NSDate* Timestamp; 

/// <summary>
/// A unique event name which will be used as the table name in the Redshift database. The name will be made lower case, and cannot not contain spaces. The use of underscores is recommended, for readability. Events also cannot match reserved terms. The PlayFab reserved terms are 'log_in' and 'purchase', 'create' and 'request', while the Redshift reserved terms can be found here: http://docs.aws.amazon.com/redshift/latest/dg/r_pg_keywords.html.
/// </summary>
@property NSString* EventName; 

/// <summary>
/// Contains all the data for this event. Event Values can be strings, booleans or numerics (float, double, integer, long) and must be consistent on a per-event basis (if the Value for Key 'A' in Event 'Foo' is an integer the first time it is sent, it must be an integer in all subsequent 'Foo' events). As with event names, Keys must also not use reserved words (see above). Finally, the size of the Body for an event must be less than 32KB (UTF-8 format).
/// </summary>
@property NSDictionary* Body; 

/// <summary>
/// Flag to set event Body as profile details in the Redshift database as well as a standard event.
/// </summary>
@property bool ProfileSetEvent; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LogEventResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginResult : PlayFabBaseModel


/// <summary>
/// Unique token authorizing the user and game at the server level, for the current session.
/// </summary>
@property NSString* SessionTicket; 

/// <summary>
/// Player's unique PlayFabId.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// True if the account was newly created on this login.
/// </summary>
@property bool NewlyCreated; 

/// <summary>
/// Settings specific to this user.
/// </summary>
@property UserSettings* SettingsForUser; 

/// <summary>
/// The time of this user's previous login. If there was no previous login, then it's DateTime.MinValue
/// </summary>
@property NSDate* LastLoginTime; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithAndroidDeviceIDRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Android device identifier for the user's device.
/// </summary>
@property NSString* AndroidDeviceId; 

/// <summary>
/// Specific Operating System version for the user's device.
/// </summary>
@property NSString* OS; 

/// <summary>
/// Specific model of the user's device.
/// </summary>
@property NSString* AndroidDevice; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Android device.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithCustomIDRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Custom unique identifier for the user, generated by the title.
/// </summary>
@property NSString* CustomId; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Custom ID.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithEmailAddressRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Email address for the account.
/// </summary>
@property NSString* Email; 

/// <summary>
/// Password for the PlayFab account (6-30 characters)
/// </summary>
@property NSString* Password; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithFacebookRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Unique identifier from Facebook for the user.
/// </summary>
@property NSString* AccessToken; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Facebook account.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithGameCenterRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Unique Game Center player id.
/// </summary>
@property NSString* PlayerId; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Game Center id.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithGoogleAccountRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Unique token from Google Play for the user.
/// </summary>
@property NSString* AccessToken; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Google account.
/// </summary>
@property bool CreateAccount; 

/// <summary>
/// Deprecated - unused
/// </summary>
@property NSString* PublisherId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithIOSDeviceIDRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Vendor-specific iOS identifier for the user's device.
/// </summary>
@property NSString* DeviceId; 

/// <summary>
/// Specific Operating System version for the user's device.
/// </summary>
@property NSString* OS; 

/// <summary>
/// Specific model of the user's device.
/// </summary>
@property NSString* DeviceModel; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this iOS device.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithKongregateRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Numeric user ID assigned by Kongregate
/// </summary>
@property NSString* KongregateId; 

/// <summary>
/// Token issued by Kongregate's client API for the user.
/// </summary>
@property NSString* AuthTicket; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Kongregate account.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithPlayFabRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// PlayFab username for the account.
/// </summary>
@property NSString* Username; 

/// <summary>
/// Password for the PlayFab account (6-30 characters)
/// </summary>
@property NSString* Password; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithPSNRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Auth code provided by the PSN OAuth provider.
/// </summary>
@property NSString* AuthCode; 

/// <summary>
/// Redirect URI supplied to PSN when requesting an auth code
/// </summary>
@property NSString* RedirectUri; 

/// <summary>
/// Id of the PSN issuer environment. If null, defaults to 256 (production)
/// </summary>
@property NSNumber* IssuerId; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this PSN account.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithSteamRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Authentication token for the user, returned as a byte array from Steam, and converted to a string (for example, the byte 0x08 should become "08").
/// </summary>
@property NSString* SteamTicket; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Steam account.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface LoginWithXboxRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Token provided by the Xbox Live SDK/XDK method GetTokenAndSignatureAsync("POST", "https://playfabapi.com", "").
/// </summary>
@property NSString* XboxToken; 

/// <summary>
/// Automatically create a PlayFab account if one is not currently linked to this Xbox Live account.
/// </summary>
@property bool CreateAccount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface MatchmakeRequest : PlayFabBaseModel


/// <summary>
/// build version to match against [Note: Required if LobbyId is not specified]
/// </summary>
@property NSString* BuildVersion; 

/// <summary>
/// region to match make against [Note: Required if LobbyId is not specified]
/// </summary>
@property Region pfRegion; 

/// <summary>
/// game mode to match make against [Note: Required if LobbyId is not specified]
/// </summary>
@property NSString* GameMode; 

/// <summary>
/// lobby identifier to match make against (used to select a specific server)
/// </summary>
@property NSString* LobbyId; 

/// <summary>
/// player statistic to use in finding a match. May be null for no stat-based matching
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// character to use for stats based matching. Leave null to use account stats
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// [deprecated]
/// </summary>
@property bool EnableQueue; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface MatchmakeResult : PlayFabBaseModel


/// <summary>
/// unique lobby identifier of the server matched
/// </summary>
@property NSString* LobbyID; 

/// <summary>
/// IP address of the server
/// </summary>
@property NSString* ServerHostname; 

/// <summary>
/// port number to use for non-http communications with the server
/// </summary>
@property NSNumber* ServerPort; 

/// <summary>
/// server authorization ticket (used by RedeemCoupon to validate user insertion into the game)
/// </summary>
@property NSString* Ticket; 

/// <summary>
/// timestamp for when the server will expire, if applicable
/// </summary>
@property NSString* Expires; 

/// <summary>
/// time in milliseconds the application is configured to wait on matchmaking results
/// </summary>
@property NSNumber* PollWaitTimeMS; 

/// <summary>
/// result of match making process
/// </summary>
@property MatchmakeStatus Status; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ModifyUserVirtualCurrencyResult : PlayFabBaseModel


/// <summary>
/// User currency was subtracted from.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Name of the virtual currency which was modified.
/// </summary>
@property NSString* VirtualCurrency; 

/// <summary>
/// Amount added or subtracted from the user's virtual currency. Maximum VC balance is Int32 (2,147,483,647). Any increase over this value will be discarded.
/// </summary>
@property NSNumber* BalanceChange; 

/// <summary>
/// Balance of the virtual currency after modification.
/// </summary>
@property NSNumber* Balance; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface OpenTradeRequest : PlayFabBaseModel


/// <summary>
/// Player inventory items offered for trade. If not set, the trade is effectively a gift request
/// </summary>
@property NSArray* OfferedInventoryInstanceIds; 

/// <summary>
/// Catalog items accepted for the trade. If not set, the trade is effectively a gift.
/// </summary>
@property NSArray* RequestedCatalogItemIds; 

/// <summary>
/// Players who are allowed to accept the trade. If null, the trade may be accepted by any player.
/// </summary>
@property NSArray* AllowedPlayerIds; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface OpenTradeResponse : PlayFabBaseModel


/// <summary>
/// The information about the trade that was just opened.
/// </summary>
@property TradeInfo* Trade; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PayForPurchaseRequest : PlayFabBaseModel


/// <summary>
/// Purchase order identifier returned from StartPurchase.
/// </summary>
@property NSString* OrderId; 

/// <summary>
/// Payment provider to use to fund the purchase.
/// </summary>
@property NSString* ProviderName; 

/// <summary>
/// Currency to use to fund the purchase.
/// </summary>
@property NSString* Currency; 

/// <summary>
/// Payment provider transaction identifier. Required for Facebook Payments.
/// </summary>
@property NSString* ProviderTransactionId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PayForPurchaseResult : PlayFabBaseModel


/// <summary>
/// Purchase order identifier.
/// </summary>
@property NSString* OrderId; 

/// <summary>
/// Status of the transaction.
/// </summary>
@property TransactionStatus Status; 

/// <summary>
/// Virtual currency cost of the transaction.
/// </summary>
@property NSDictionary* VCAmount; 

/// <summary>
/// Real world currency for the transaction.
/// </summary>
@property NSString* PurchaseCurrency; 

/// <summary>
/// Real world cost of the transaction.
/// </summary>
@property NSNumber* PurchasePrice; 

/// <summary>
/// Local credit applied to the transaction (provider specific).
/// </summary>
@property NSNumber* CreditApplied; 

/// <summary>
/// Provider used for the transaction.
/// </summary>
@property NSString* ProviderData; 

/// <summary>
/// URL to the purchase provider page that details the purchase.
/// </summary>
@property NSString* PurchaseConfirmationPageURL; 

/// <summary>
/// Current virtual currency totals for the user.
/// </summary>
@property NSDictionary* VirtualCurrency; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PaymentOption : PlayFabBaseModel


/// <summary>
/// Specific currency to use to fund the purchase.
/// </summary>
@property NSString* Currency; 

/// <summary>
/// Name of the purchase provider for this option.
/// </summary>
@property NSString* ProviderName; 

/// <summary>
/// Amount of the specified currency needed for the purchase.
/// </summary>
@property NSNumber* Price; 

/// <summary>
/// Amount of existing credit the user has with the provider.
/// </summary>
@property NSNumber* StoreCredit; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PlayerLeaderboardEntry : PlayFabBaseModel


/// <summary>
/// PlayFab unique identifier of the user for this leaderboard entry.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Title-specific display name of the user for this leaderboard entry.
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// Specific value of the user's statistic.
/// </summary>
@property NSNumber* StatValue; 

/// <summary>
/// User's overall position in the leaderboard.
/// </summary>
@property NSNumber* Position; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PSNAccountPlayFabIdPair : PlayFabBaseModel


/// <summary>
/// Unique PlayStation Network identifier for a user.
/// </summary>
@property NSString* PSNAccountId; 

/// <summary>
/// Unique PlayFab identifier for a user, or null if no PlayFab account is linked to the PlayStation Network identifier.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PurchaseItemRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier of the item to purchase.
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// Virtual currency to use to purchase the item.
/// </summary>
@property NSString* VirtualCurrency; 

/// <summary>
/// Price the client expects to pay for the item (in case a new catalog or store was uploaded, with new prices).
/// </summary>
@property NSNumber* Price; 

/// <summary>
/// Catalog version for the items to be purchased (defaults to most recent version.
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Store to buy this item through. If not set, prices default to those in the catalog.
/// </summary>
@property NSString* StoreId; 

/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface PurchaseItemResult : PlayFabBaseModel


/// <summary>
/// Details for the items purchased.
/// </summary>
@property NSArray* Items; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RedeemCouponRequest : PlayFabBaseModel


/// <summary>
/// Generated coupon code to redeem.
/// </summary>
@property NSString* CouponCode; 

/// <summary>
/// Catalog version of the coupon.
/// </summary>
@property NSString* CatalogVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RedeemCouponResult : PlayFabBaseModel


/// <summary>
/// Items granted to the player as a result of redeeming the coupon.
/// </summary>
@property NSArray* GrantedItems; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RefreshPSNAuthTokenRequest : PlayFabBaseModel


/// <summary>
/// Auth code returned by PSN OAuth system.
/// </summary>
@property NSString* AuthCode; 

/// <summary>
/// Redirect URI supplied to PSN when requesting an auth code
/// </summary>
@property NSString* RedirectUri; 

/// <summary>
/// Id of the PSN issuer environment. If null, defaults to 256 (production)
/// </summary>
@property NSNumber* IssuerId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RegionInfo : PlayFabBaseModel


/// <summary>
/// unique identifier for the region
/// </summary>
@property Region pfRegion; 

/// <summary>
/// name of the region
/// </summary>
@property NSString* Name; 

/// <summary>
/// indicates whether the server specified is available in this region
/// </summary>
@property bool Available; 

/// <summary>
/// url to ping to get roundtrip time
/// </summary>
@property NSString* PingUrl; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RegisterForIOSPushNotificationRequest : PlayFabBaseModel


/// <summary>
/// Unique token generated by the Apple Push Notification service when the title registered to receive push notifications.
/// </summary>
@property NSString* DeviceToken; 

/// <summary>
/// If true, send a test push message immediately after sucessful registration. Defaults to false.
/// </summary>
@property bool SendPushNotificationConfirmation; 

/// <summary>
/// Message to display when confirming push notification.
/// </summary>
@property NSString* ConfirmationMessage; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RegisterForIOSPushNotificationResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RegisterPlayFabUserRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// PlayFab username for the account (3-20 characters)
/// </summary>
@property NSString* Username; 

/// <summary>
/// User email address attached to their account
/// </summary>
@property NSString* Email; 

/// <summary>
/// Password for the PlayFab account (6-30 characters)
/// </summary>
@property NSString* Password; 

/// <summary>
/// An optional parameter that specifies whether both the username and email parameters are required. If true, both parameters are required; if false, the user must supply either the username or email parameter. The default value is true.
/// </summary>
@property bool RequireBothUsernameAndEmail; 

/// <summary>
/// An optional parameter for setting the display name for this title.
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// [Deprecated - The Origination of a user is determined by the API call used to create the account. In the case of RegisterPlayFabUser, it will be Organic.
/// </summary>
@property NSString* Origination; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RegisterPlayFabUserResult : PlayFabBaseModel


/// <summary>
/// PlayFab unique identifier for this newly created account.
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Unique token identifying the user and game at the server level, for the current session.
/// </summary>
@property NSString* SessionTicket; 

/// <summary>
/// PlayFab unique user name.
/// </summary>
@property NSString* Username; 

/// <summary>
/// Settings specific to this user.
/// </summary>
@property UserSettings* SettingsForUser; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RemoveFriendRequest : PlayFabBaseModel


/// <summary>
/// PlayFab identifier of the friend account which is to be removed.
/// </summary>
@property NSString* FriendPlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RemoveFriendResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RemoveSharedGroupMembersRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the shared group.
/// </summary>
@property NSString* SharedGroupId; 

/// <summary>
/// An array of unique PlayFab assigned ID of the user on whom the operation will be performed.
/// </summary>
@property NSArray* PlayFabIds; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RemoveSharedGroupMembersResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ReportPlayerClientRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab identifier of the reported player.
/// </summary>
@property NSString* ReporteeId; 

/// <summary>
/// Optional additional comment by reporting player.
/// </summary>
@property NSString* Comment; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ReportPlayerClientResult : PlayFabBaseModel


/// <summary>
/// Indicates whether this action completed successfully.
/// </summary>
@property bool Updated; 

/// <summary>
/// The number of remaining reports which may be filed today.
/// </summary>
@property NSNumber* SubmissionsRemaining; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RestoreIOSPurchasesRequest : PlayFabBaseModel


/// <summary>
/// Base64 encoded receipt data, passed back by the App Store as a result of a successful purchase.
/// </summary>
@property NSString* ReceiptData; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RestoreIOSPurchasesResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RunCloudScriptRequest : PlayFabBaseModel


/// <summary>
/// server action to trigger
/// </summary>
@property NSString* ActionId; 

/// <summary>
/// parameters to pass into the action (If you use this, don't use ParamsEncoded)
/// </summary>
@property NSDictionary* Params; 

/// <summary>
/// json-encoded parameters to pass into the action (If you use this, don't use Params)
/// </summary>
@property NSString* ParamsEncoded; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface RunCloudScriptResult : PlayFabBaseModel


/// <summary>
/// id of Cloud Script run
/// </summary>
@property NSString* ActionId; 

/// <summary>
/// version of Cloud Script run
/// </summary>
@property NSNumber* Version; 

/// <summary>
/// revision of Cloud Script run
/// </summary>
@property NSNumber* Revision; 

/// <summary>
/// return values from the server action as a dynamic object
/// </summary>
@property NSDictionary* Results; 

/// <summary>
/// return values from the server action as a JSON encoded string
/// </summary>
@property NSString* ResultsEncoded; 

/// <summary>
/// any log statements generated during the run of this action
/// </summary>
@property NSString* ActionLog; 

/// <summary>
/// time this script took to run, in seconds
/// </summary>
@property NSNumber* ExecutionTime; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SendAccountRecoveryEmailRequest : PlayFabBaseModel


/// <summary>
/// User email address attached to their account
/// </summary>
@property NSString* Email; 

/// <summary>
/// Unique identifier for the title, found in the Settings > Game Properties section of the PlayFab developer site when a title has been selected
/// </summary>
@property NSString* TitleId; 

/// <summary>
/// Deprecated - unused
/// </summary>
@property NSString* PublisherId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SendAccountRecoveryEmailResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SetFriendTagsRequest : PlayFabBaseModel


/// <summary>
/// PlayFab identifier of the friend account to which the tag(s) should be applied.
/// </summary>
@property NSString* FriendPlayFabId; 

/// <summary>
/// Array of tags to set on the friend account.
/// </summary>
@property NSArray* Tags; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SetFriendTagsResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SharedGroupDataRecord : PlayFabBaseModel


/// <summary>
/// Data stored for the specified group data key.
/// </summary>
@property NSString* Value; 

/// <summary>
/// Unique PlayFab identifier of the user to last update this value.
/// </summary>
@property NSString* LastUpdatedBy; 

/// <summary>
/// Timestamp for when this data was last updated.
/// </summary>
@property NSDate* LastUpdated; 

/// <summary>
/// Indicates whether this data can be read by all users (public) or only members of the group (private).
/// </summary>
@property UserDataPermission Permission; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface StartGameRequest : PlayFabBaseModel


/// <summary>
/// version information for the build of the game server which is to be started
/// </summary>
@property NSString* BuildVersion; 

/// <summary>
/// the region to associate this server with for match filtering
/// </summary>
@property Region pfRegion; 

/// <summary>
/// the title-defined game mode this server is to be running (defaults to 0 if there is only one mode)
/// </summary>
@property NSString* GameMode; 

/// <summary>
/// player statistic for others to use in finding this game. May be null for no stat-based matching
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// character to use for stats based matching. Leave null to use account stats
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// custom command line argument when starting game server process
/// </summary>
@property NSString* CustomCommandLineData; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface StartGameResult : PlayFabBaseModel


/// <summary>
/// unique identifier for the lobby of the server started
/// </summary>
@property NSString* LobbyID; 

/// <summary>
/// server IP address
/// </summary>
@property NSString* ServerHostname; 

/// <summary>
/// port on the server to be used for communication
/// </summary>
@property NSNumber* ServerPort; 

/// <summary>
/// unique identifier for the server
/// </summary>
@property NSString* Ticket; 

/// <summary>
/// timestamp for when the server should expire, if applicable
/// </summary>
@property NSString* Expires; 

/// <summary>
/// password required to log into the server
/// </summary>
@property NSString* Password; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface StartPurchaseRequest : PlayFabBaseModel


/// <summary>
/// Catalog version for the items to be purchased. Defaults to most recent catalog.
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Store through which to purchase items. If not set, prices will be pulled from the catalog itself.
/// </summary>
@property NSString* StoreId; 

/// <summary>
/// Array of items to purchase.
/// </summary>
@property NSArray* Items; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface StartPurchaseResult : PlayFabBaseModel


/// <summary>
/// Purchase order identifier.
/// </summary>
@property NSString* OrderId; 

/// <summary>
/// Cart items to be purchased.
/// </summary>
@property NSArray* Contents; 

/// <summary>
/// Available methods by which the user can pay.
/// </summary>
@property NSArray* PaymentOptions; 

/// <summary>
/// Current virtual currency totals for the user.
/// </summary>
@property NSDictionary* VirtualCurrencyBalances; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface StatisticUpdate : PlayFabBaseModel


/// <summary>
/// unique name of the statistic
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// for updates to an existing statistic value for a player, the version of the statistic when it was loaded. Null when setting the statistic value for the first time.
/// </summary>
@property NSNumber* Version; 

/// <summary>
/// statistic value for the player
/// </summary>
@property NSNumber* Value; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface StatisticValue : PlayFabBaseModel


/// <summary>
/// unique name of the statistic
/// </summary>
@property NSString* StatisticName; 

/// <summary>
/// statistic value for the player
/// </summary>
@property NSNumber* Value; 

/// <summary>
/// for updates to an existing statistic value for a player, the version of the statistic when it was loaded
/// </summary>
@property NSString* Version; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SteamPlayFabIdPair : PlayFabBaseModel


/// <summary>
/// Deprecated: Please use SteamStringId
/// </summary>
@property NSNumber* SteamId; 

/// <summary>
/// Unique Steam identifier for a user.
/// </summary>
@property NSString* SteamStringId; 

/// <summary>
/// Unique PlayFab identifier for a user, or null if no PlayFab account is linked to the Steam identifier.
/// </summary>
@property NSString* PlayFabId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


/// <summary>
/// A store entry that list a catalog item at a particular price
/// </summary>
@interface StoreItem : PlayFabBaseModel


/// <summary>
/// unique identifier of the item as it exists in the catalog - note that this must exactly match the ItemId from the catalog
/// </summary>
@property NSString* ItemId; 

/// <summary>
/// price of this item in virtual currencies and "RM" (the base Real Money purchase price, in USD pennies)
/// </summary>
@property NSDictionary* VirtualCurrencyPrices; 

/// <summary>
/// override prices for this item for specific currencies
/// </summary>
@property NSDictionary* RealCurrencyPrices; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface SubtractUserVirtualCurrencyRequest : PlayFabBaseModel


/// <summary>
/// Name of the virtual currency which is to be decremented.
/// </summary>
@property NSString* VirtualCurrency; 

/// <summary>
/// Amount to be subtracted from the user balance of the specified virtual currency.
/// </summary>
@property NSNumber* Amount; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface TitleNewsItem : PlayFabBaseModel


/// <summary>
/// Date and time when the news items was posted.
/// </summary>
@property NSDate* Timestamp; 

/// <summary>
/// Unique identifier of news item.
/// </summary>
@property NSString* NewsId; 

/// <summary>
/// Title of the news item.
/// </summary>
@property NSString* Title; 

/// <summary>
/// News item text.
/// </summary>
@property NSString* Body; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface TradeInfo : PlayFabBaseModel


/// <summary>
/// Describes the current state of this trade.
/// </summary>
@property TradeStatus Status; 

/// <summary>
/// The identifier for this trade.
/// </summary>
@property NSString* TradeId; 

/// <summary>
/// The PlayFabId for the offering player.
/// </summary>
@property NSString* OfferingPlayerId; 

/// <summary>
/// The itemInstance Ids that are being offered.
/// </summary>
@property NSArray* OfferedInventoryInstanceIds; 

/// <summary>
/// The catalogItem Ids of the item instances being offered.
/// </summary>
@property NSArray* OfferedCatalogItemIds; 

/// <summary>
/// The catalogItem Ids requested in exchange.
/// </summary>
@property NSArray* RequestedCatalogItemIds; 

/// <summary>
/// An optional list of players allowed to complete this trade.  If null, anybody can complete the trade.
/// </summary>
@property NSArray* AllowedPlayerIds; 

/// <summary>
/// The PlayFab ID of the player who accepted the trade. If null, no one has accepted the trade.
/// </summary>
@property NSString* AcceptedPlayerId; 

/// <summary>
/// Item instances from the accepting player that are used to fulfill the trade. If null, no one has accepted the trade.
/// </summary>
@property NSArray* AcceptedInventoryInstanceIds; 

/// <summary>
/// The UTC time when this trade was created.
/// </summary>
@property NSDate* OpenedAt; 

/// <summary>
/// If set, The UTC time when this trade was fulfilled.
/// </summary>
@property NSDate* FilledAt; 

/// <summary>
/// If set, The UTC time when this trade was canceled.
/// </summary>
@property NSDate* CancelledAt; 

/// <summary>
/// If set, The UTC time when this trade was made invalid.
/// </summary>
@property NSDate* InvalidatedAt; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkAndroidDeviceIDRequest : PlayFabBaseModel


/// <summary>
/// Android device identifier for the user's device. If not specified, the most recently signed in Android Device ID will be used.
/// </summary>
@property NSString* AndroidDeviceId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkAndroidDeviceIDResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkCustomIDRequest : PlayFabBaseModel


/// <summary>
/// Custom unique identifier for the user, generated by the title. If not specified, the most recently signed in Custom ID will be used.
/// </summary>
@property NSString* CustomId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkCustomIDResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkFacebookAccountRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkFacebookAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkGameCenterAccountRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkGameCenterAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkGoogleAccountRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkGoogleAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkIOSDeviceIDRequest : PlayFabBaseModel


/// <summary>
/// Vendor-specific iOS identifier for the user's device. If not specified, the most recently signed in iOS Device ID will be used.
/// </summary>
@property NSString* DeviceId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkIOSDeviceIDResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkKongregateAccountRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkKongregateAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkPSNAccountRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkPSNAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkSteamAccountRequest : PlayFabBaseModel


/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkSteamAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkXboxAccountRequest : PlayFabBaseModel


/// <summary>
/// Token provided by the Xbox Live SDK/XDK method GetTokenAndSignatureAsync("POST", "https://playfabapi.com", "").
/// </summary>
@property NSString* XboxToken; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlinkXboxAccountResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlockContainerInstanceRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// ItemInstanceId of the container to unlock.
/// </summary>
@property NSString* ContainerItemInstanceId; 

/// <summary>
/// ItemInstanceId of the key that will be consumed by unlocking this container.  If the container requires a key, this parameter is required.
/// </summary>
@property NSString* KeyItemInstanceId; 

/// <summary>
/// Specifies the catalog version that should be used to determine container contents.  If unspecified, uses catalog associated with the item instance.
/// </summary>
@property NSString* CatalogVersion; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlockContainerItemRequest : PlayFabBaseModel


/// <summary>
/// Catalog ItemId of the container type to unlock.
/// </summary>
@property NSString* ContainerItemId; 

/// <summary>
/// Specifies the catalog version that should be used to determine container contents.  If unspecified, uses default/primary catalog.
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UnlockContainerItemResult : PlayFabBaseModel


/// <summary>
/// Unique instance identifier of the container unlocked.
/// </summary>
@property NSString* UnlockedItemInstanceId; 

/// <summary>
/// Unique instance identifier of the key used to unlock the container, if applicable.
/// </summary>
@property NSString* UnlockedWithItemInstanceId; 

/// <summary>
/// Items granted to the player as a result of unlocking the container.
/// </summary>
@property NSArray* GrantedItems; 

/// <summary>
/// Virtual currency granted to the player as a result of unlocking the container.
/// </summary>
@property NSDictionary* VirtualCurrency; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateCharacterDataRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Key-value pairs to be written to the custom data. Note that keys are trimmed of whitespace, are limited in size, and may not begin with a '!' character.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// Optional list of Data-keys to remove from UserData.  Some SDKs cannot insert null-values into Data due to language constraints.  Use this to delete the keys directly.
/// </summary>
@property NSArray* KeysToRemove; 

/// <summary>
/// Permission to be applied to all user data keys written in this request. Defaults to "private" if not set.
/// </summary>
@property UserDataPermission Permission; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateCharacterDataResult : PlayFabBaseModel


/// <summary>
/// Indicates the current version of the data that has been set. This is incremented with every set call for that type of data (read-only, internal, etc). This version can be provided in Get calls to find updated data.
/// </summary>
@property NSNumber* DataVersion; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateCharacterStatisticsRequest : PlayFabBaseModel


/// <summary>
/// Unique PlayFab assigned ID for a specific character owned by a user
/// </summary>
@property NSString* CharacterId; 

/// <summary>
/// Statistics to be updated with the provided values.
/// </summary>
@property NSDictionary* CharacterStatistics; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateCharacterStatisticsResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdatePlayerStatisticsRequest : PlayFabBaseModel


/// <summary>
/// Statistics to be updated with the provided values
/// </summary>
@property NSArray* Statistics; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdatePlayerStatisticsResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateSharedGroupDataRequest : PlayFabBaseModel


/// <summary>
/// Unique identifier for the shared group.
/// </summary>
@property NSString* SharedGroupId; 

/// <summary>
/// Key-value pairs to be written to the custom data. Note that keys are trimmed of whitespace, are limited in size, and may not begin with a '!' character.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// Optional list of Data-keys to remove from UserData.  Some SDKs cannot insert null-values into Data due to language constraints.  Use this to delete the keys directly.
/// </summary>
@property NSArray* KeysToRemove; 

/// <summary>
/// Permission to be applied to all user data keys in this request.
/// </summary>
@property UserDataPermission Permission; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateSharedGroupDataResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateUserDataRequest : PlayFabBaseModel


/// <summary>
/// Key-value pairs to be written to the custom data. Note that keys are trimmed of whitespace, are limited in size, and may not begin with a '!' character.
/// </summary>
@property NSDictionary* Data; 

/// <summary>
/// Optional list of Data-keys to remove from UserData.  Some SDKs cannot insert null-values into Data due to language constraints.  Use this to delete the keys directly.
/// </summary>
@property NSArray* KeysToRemove; 

/// <summary>
/// Permission to be applied to all user data keys written in this request. Defaults to "private" if not set.
/// </summary>
@property UserDataPermission Permission; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateUserDataResult : PlayFabBaseModel


/// <summary>
/// Indicates the current version of the data that has been set. This is incremented with every set call for that type of data (read-only, internal, etc). This version can be provided in Get calls to find updated data.
/// </summary>
@property NSNumber* DataVersion; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateUserStatisticsRequest : PlayFabBaseModel


/// <summary>
/// Statistics to be updated with the provided values.
/// </summary>
@property NSDictionary* UserStatistics; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateUserStatisticsResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateUserTitleDisplayNameRequest : PlayFabBaseModel


/// <summary>
/// New title display name for the user - must be between 3 and 25 characters.
/// </summary>
@property NSString* DisplayName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UpdateUserTitleDisplayNameResult : PlayFabBaseModel


/// <summary>
/// Current title display name for the user (this will be the original display name if the rename attempt failed).
/// </summary>
@property NSString* DisplayName; 

/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserAccountInfo : PlayFabBaseModel


/// <summary>
/// Unique identifier for the user account
/// </summary>
@property NSString* PlayFabId; 

/// <summary>
/// Timestamp indicating when the user account was created
/// </summary>
@property NSDate* Created; 

/// <summary>
/// User account name in the PlayFab service
/// </summary>
@property NSString* Username; 

/// <summary>
/// Title-specific information for the user account
/// </summary>
@property UserTitleInfo* TitleInfo; 

/// <summary>
/// Personal information for the user which is considered more sensitive
/// </summary>
@property UserPrivateAccountInfo* PrivateInfo; 

/// <summary>
/// User Facebook information, if a Facebook account has been linked
/// </summary>
@property UserFacebookInfo* FacebookInfo; 

/// <summary>
/// User Steam information, if a Steam account has been linked
/// </summary>
@property UserSteamInfo* SteamInfo; 

/// <summary>
/// User Gamecenter information, if a Gamecenter account has been linked
/// </summary>
@property UserGameCenterInfo* GameCenterInfo; 

/// <summary>
/// User iOS device information, if an iOS device has been linked
/// </summary>
@property UserIosDeviceInfo* IosDeviceInfo; 

/// <summary>
/// User Android device information, if an Android device has been linked
/// </summary>
@property UserAndroidDeviceInfo* AndroidDeviceInfo; 

/// <summary>
/// User Kongregate account information, if a Kongregate account has been linked
/// </summary>
@property UserKongregateInfo* KongregateInfo; 

/// <summary>
/// User PSN account information, if a PSN account has been linked
/// </summary>
@property UserPsnInfo* PsnInfo; 

/// <summary>
/// User Google account information, if a Google account has been linked
/// </summary>
@property UserGoogleInfo* GoogleInfo; 

/// <summary>
/// User XBox account information, if a XBox account has been linked
/// </summary>
@property UserXboxInfo* XboxInfo; 

/// <summary>
/// Custom ID information, if a custom ID has been assigned
/// </summary>
@property UserCustomIdInfo* CustomIdInfo; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserAndroidDeviceInfo : PlayFabBaseModel


/// <summary>
/// Android device ID
/// </summary>
@property NSString* AndroidDeviceId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserCustomIdInfo : PlayFabBaseModel


/// <summary>
/// Custom ID
/// </summary>
@property NSString* CustomId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserDataRecord : PlayFabBaseModel


/// <summary>
/// Data stored for the specified user data key.
/// </summary>
@property NSString* Value; 

/// <summary>
/// Timestamp for when this data was last updated.
/// </summary>
@property NSDate* LastUpdated; 

/// <summary>
/// Indicates whether this data can be read by all users (public) or only the user (private).
/// </summary>
@property UserDataPermission Permission; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserFacebookInfo : PlayFabBaseModel


/// <summary>
/// Facebook identifier
/// </summary>
@property NSString* FacebookId; 

/// <summary>
/// Facebook full name
/// </summary>
@property NSString* FullName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserGameCenterInfo : PlayFabBaseModel


/// <summary>
/// Gamecenter identifier
/// </summary>
@property NSString* GameCenterId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserGoogleInfo : PlayFabBaseModel


/// <summary>
/// Google ID
/// </summary>
@property NSString* GoogleId; 

/// <summary>
/// Email address of the Google account
/// </summary>
@property NSString* GoogleEmail; 

/// <summary>
/// Locale of the Google account
/// </summary>
@property NSString* GoogleLocale; 

/// <summary>
/// Gender information of the Google account
/// </summary>
@property NSString* GoogleGender; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserIosDeviceInfo : PlayFabBaseModel


/// <summary>
/// iOS device ID
/// </summary>
@property NSString* IosDeviceId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserKongregateInfo : PlayFabBaseModel


/// <summary>
/// Kongregate ID
/// </summary>
@property NSString* KongregateId; 

/// <summary>
/// Kongregate Username
/// </summary>
@property NSString* KongregateName; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserPrivateAccountInfo : PlayFabBaseModel


/// <summary>
/// user email address
/// </summary>
@property NSString* Email; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserPsnInfo : PlayFabBaseModel


/// <summary>
/// PSN account ID
/// </summary>
@property NSString* PsnAccountId; 

/// <summary>
/// PSN online ID
/// </summary>
@property NSString* PsnOnlineId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserSettings : PlayFabBaseModel


/// <summary>
/// Boolean for whether this player is eligible for ad tracking.
/// </summary>
@property bool NeedsAttribution; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserSteamInfo : PlayFabBaseModel


/// <summary>
/// Steam identifier
/// </summary>
@property NSString* SteamId; 

/// <summary>
/// the country in which the player resides, from Steam data
/// </summary>
@property NSString* SteamCountry; 

/// <summary>
/// currency type set in the user Steam account
/// </summary>
@property Currency SteamCurrency; 

/// <summary>
/// what stage of game ownership the user is listed as being in, from Steam
/// </summary>
@property TitleActivationStatus SteamActivationStatus; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserTitleInfo : PlayFabBaseModel


/// <summary>
/// name of the user, as it is displayed in-game
/// </summary>
@property NSString* DisplayName; 

/// <summary>
/// source by which the user first joined the game, if known
/// </summary>
@property UserOrigination Origination; 

/// <summary>
/// timestamp indicating when the user was first associated with this game (this can differ significantly from when the user first registered with PlayFab)
/// </summary>
@property NSDate* Created; 

/// <summary>
/// timestamp for the last user login for this title
/// </summary>
@property NSDate* LastLogin; 

/// <summary>
/// timestamp indicating when the user first signed into this game (this can differ from the Created timestamp, as other events, such as issuing a beta key to the user, can associate the title to the user)
/// </summary>
@property NSDate* FirstLogin; 

/// <summary>
/// boolean indicating whether or not the user is currently banned for a title
/// </summary>
@property bool isBanned; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface UserXboxInfo : PlayFabBaseModel


/// <summary>
/// XBox user ID
/// </summary>
@property NSString* XboxUserId; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ValidateAmazonReceiptRequest : PlayFabBaseModel


/// <summary>
/// ReceiptId returned by the Amazon App Store in-app purchase API
/// </summary>
@property NSString* ReceiptId; 

/// <summary>
/// AmazonId of the user making the purchase as returned by the Amazon App Store in-app purchase API
/// </summary>
@property NSString* UserId; 

/// <summary>
/// Catalog version to use when granting receipt item. If null, defaults to primary catalog.
/// </summary>
@property NSString* CatalogVersion; 

/// <summary>
/// Currency used for the purchase.
/// </summary>
@property NSString* CurrencyCode; 

/// <summary>
/// Amount of the stated currency paid for the object.
/// </summary>
@property NSNumber* PurchasePrice; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ValidateAmazonReceiptResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ValidateGooglePlayPurchaseRequest : PlayFabBaseModel


/// <summary>
/// Original JSON string returned by the Google Play IAB API.
/// </summary>
@property NSString* ReceiptJson; 

/// <summary>
/// Signature returned by the Google Play IAB API.
/// </summary>
@property NSString* Signature; 

/// <summary>
/// Currency used for the purchase.
/// </summary>
@property NSString* CurrencyCode; 

/// <summary>
/// Amount of the stated currency paid for the object.
/// </summary>
@property NSNumber* PurchasePrice; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ValidateGooglePlayPurchaseResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ValidateIOSReceiptRequest : PlayFabBaseModel


/// <summary>
/// Base64 encoded receipt data, passed back by the App Store as a result of a successful purchase.
/// </summary>
@property NSString* ReceiptData; 

/// <summary>
/// Currency used for the purchase.
/// </summary>
@property NSString* CurrencyCode; 

/// <summary>
/// Amount of the stated currency paid for the object.
/// </summary>
@property NSNumber* PurchasePrice; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface ValidateIOSReceiptResult : PlayFabBaseModel


/*
@property NSObject* Request;
@property NSObject* CustomData;
*/
-(id)initWithDictionary:(NSDictionary*)properties;

@end


@interface VirtualCurrencyRechargeTime : PlayFabBaseModel


/// <summary>
/// Time remaining (in seconds) before the next recharge increment of the virtual currency.
/// </summary>
@property NSNumber* SecondsToRecharge; 

/// <summary>
/// Server timestamp in UTC indicating the next time the virtual currency will be incremented.
/// </summary>
@property NSDate* RechargeTime; 

/// <summary>
/// Maximum value to which the regenerating currency will automatically increment. Note that it can exceed this value through use of the AddUserVirtualCurrency API call. However, it will not regenerate automatically until it has fallen below this value.
/// </summary>
@property NSNumber* RechargeMax; 

/**/
-(id)initWithDictionary:(NSDictionary*)properties;

@end
