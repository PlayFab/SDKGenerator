declare module PlayFabModule {
    export interface IPlayFab {
        sdk_version: string;
        buildIdentifier: string;
        settings: IPlayFabSettings;
    }
    export interface IPlayFabSettings {
        titleId: string;
        developerSecretKey?: string;
        advertisingIdType?: string;
        advertisingIdValue?: string;
        disableAdvertising?: boolean;
        AD_TYPE_IDFA: string;
        AD_TYPE_ANDROID_ID: string;
    }
    export interface IPlayFabRequestCommon { }
    export interface IPlayFabError {
        code: number;
        status: string;
        error: string;
        errorCode: number;
        errorMessage: string;
        errorDetails?: { [key: string]: string[] };
    }
    export interface IPlayFabSuccessContainer<TResult extends IPlayFabResultCommon> extends IPlayFabError {
        data: TResult;
    }
    export interface IPlayFabResultCommon extends IPlayFabError { }

    export interface ApiCallback<TResult extends IPlayFabResultCommon> { (error: IPlayFabError, result: IPlayFabSuccessContainer<TResult>): void }
}
