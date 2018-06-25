using PlayFab.EntityModels;
using PlayFab.Json;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab
{
    /// <summary>
    /// PlayFab Entity APIs provide a variety of core PlayFab features and work consistently across a broad set of entities,
    /// such as titles, players, characters, and more.
    /// </summary>
    public class PlayFabEntityAPI
    {
        /// <summary>
        /// Abort pending file uploads to an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<AbortFileUploadsResponse>> AbortFileUploadsAsync(AbortFileUploadsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/File/AbortFileUploads", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<AbortFileUploadsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<AbortFileUploadsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<AbortFileUploadsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Accepts an outstanding invitation to to join a group
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> AcceptGroupApplicationAsync(AcceptGroupApplicationRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/AcceptGroupApplication", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Accepts an invitation to join a group
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> AcceptGroupInvitationAsync(AcceptGroupInvitationRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/AcceptGroupInvitation", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Adds members to a group or role.
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> AddMembersAsync(AddMembersRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/AddMembers", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Applies to join a group
        /// </summary>
        public static async Task<PlayFabResult<ApplyToGroupResponse>> ApplyToGroupAsync(ApplyToGroupRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ApplyToGroup", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ApplyToGroupResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ApplyToGroupResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ApplyToGroupResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Blocks a list of entities from joining a group.
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> BlockEntityAsync(BlockEntityRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/BlockEntity", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Changes the role membership of a list of entities from one role to another.
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> ChangeMemberRoleAsync(ChangeMemberRoleRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ChangeMemberRole", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Creates a new group.
        /// </summary>
        public static async Task<PlayFabResult<CreateGroupResponse>> CreateGroupAsync(CreateGroupRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/CreateGroup", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<CreateGroupResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<CreateGroupResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<CreateGroupResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Creates a new group role.
        /// </summary>
        public static async Task<PlayFabResult<CreateGroupRoleResponse>> CreateRoleAsync(CreateGroupRoleRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/CreateRole", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<CreateGroupRoleResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<CreateGroupRoleResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<CreateGroupRoleResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Delete files on an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<DeleteFilesResponse>> DeleteFilesAsync(DeleteFilesRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/File/DeleteFiles", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<DeleteFilesResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<DeleteFilesResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<DeleteFilesResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Deletes a group and all roles, invitations, join requests, and blocks associated with it.
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> DeleteGroupAsync(DeleteGroupRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/DeleteGroup", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Deletes an existing role in a group.
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> DeleteRoleAsync(DeleteRoleRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/DeleteRole", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Finalize file uploads to an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<FinalizeFileUploadsResponse>> FinalizeFileUploadsAsync(FinalizeFileUploadsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/File/FinalizeFileUploads", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<FinalizeFileUploadsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<FinalizeFileUploadsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<FinalizeFileUploadsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Method to exchange a legacy AuthenticationTicket or title SecretKey for an Entity Token or to refresh a still valid
        /// Entity Token.
        /// </summary>
        public static async Task<PlayFabResult<GetEntityTokenResponse>> GetEntityTokenAsync(GetEntityTokenRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            string authKey = null, authValue = null;
            if (PlayFabSettings.ClientSessionTicket != null) { authKey = "X-Authorization"; authValue = PlayFabSettings.ClientSessionTicket; }
            if (PlayFabSettings.DeveloperSecretKey != null) { authKey = "X-SecretKey"; authValue = PlayFabSettings.DeveloperSecretKey; }
            if (PlayFabSettings.EntityToken != null) { authKey = "X-EntityToken"; authValue = PlayFabSettings.EntityToken; }

            var httpResult = await PlayFabSenderHelper.DoPost("/Authentication/GetEntityToken", request, authKey, authValue, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetEntityTokenResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetEntityTokenResponse>>(resultRawJson);
            var result = resultData.data;
            PlayFabSettings.EntityToken = result.EntityToken;

            return new PlayFabResult<GetEntityTokenResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Retrieves file metadata from an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<GetFilesResponse>> GetFilesAsync(GetFilesRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/File/GetFiles", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetFilesResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetFilesResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<GetFilesResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Gets the global title access policy
        /// </summary>
        public static async Task<PlayFabResult<GetGlobalPolicyResponse>> GetGlobalPolicyAsync(GetGlobalPolicyRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Profile/GetGlobalPolicy", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetGlobalPolicyResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetGlobalPolicyResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<GetGlobalPolicyResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Gets information about a group and its roles
        /// </summary>
        public static async Task<PlayFabResult<GetGroupResponse>> GetGroupAsync(GetGroupRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/GetGroup", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetGroupResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetGroupResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<GetGroupResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Retrieves objects from an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<GetObjectsResponse>> GetObjectsAsync(GetObjectsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Object/GetObjects", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetObjectsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetObjectsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<GetObjectsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Retrieves the entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<GetEntityProfileResponse>> GetProfileAsync(GetEntityProfileRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Profile/GetProfile", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetEntityProfileResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetEntityProfileResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<GetEntityProfileResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Retrieves the entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<GetEntityProfilesResponse>> GetProfilesAsync(GetEntityProfilesRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Profile/GetProfiles", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<GetEntityProfilesResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<GetEntityProfilesResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<GetEntityProfilesResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Initiates file uploads to an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<InitiateFileUploadsResponse>> InitiateFileUploadsAsync(InitiateFileUploadsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/File/InitiateFileUploads", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<InitiateFileUploadsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<InitiateFileUploadsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<InitiateFileUploadsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Invites a player to join a group
        /// </summary>
        public static async Task<PlayFabResult<InviteToGroupResponse>> InviteToGroupAsync(InviteToGroupRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/InviteToGroup", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<InviteToGroupResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<InviteToGroupResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<InviteToGroupResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Checks to see if an entity is a member of a group or role within the group
        /// </summary>
        public static async Task<PlayFabResult<IsMemberResponse>> IsMemberAsync(IsMemberRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/IsMember", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<IsMemberResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<IsMemberResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<IsMemberResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Lists all outstanding requests to join a group
        /// </summary>
        public static async Task<PlayFabResult<ListGroupApplicationsResponse>> ListGroupApplicationsAsync(ListGroupApplicationsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ListGroupApplications", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ListGroupApplicationsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ListGroupApplicationsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ListGroupApplicationsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Lists all entities blocked from joining a group
        /// </summary>
        public static async Task<PlayFabResult<ListGroupBlocksResponse>> ListGroupBlocksAsync(ListGroupBlocksRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ListGroupBlocks", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ListGroupBlocksResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ListGroupBlocksResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ListGroupBlocksResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Lists all outstanding invitations for a group
        /// </summary>
        public static async Task<PlayFabResult<ListGroupInvitationsResponse>> ListGroupInvitationsAsync(ListGroupInvitationsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ListGroupInvitations", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ListGroupInvitationsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ListGroupInvitationsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ListGroupInvitationsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Lists all members for a group
        /// </summary>
        public static async Task<PlayFabResult<ListGroupMembersResponse>> ListGroupMembersAsync(ListGroupMembersRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ListGroupMembers", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ListGroupMembersResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ListGroupMembersResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ListGroupMembersResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Lists all groups and roles for an entity
        /// </summary>
        public static async Task<PlayFabResult<ListMembershipResponse>> ListMembershipAsync(ListMembershipRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ListMembership", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ListMembershipResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ListMembershipResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ListMembershipResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Lists all outstanding invitations and group applications for an entity
        /// </summary>
        public static async Task<PlayFabResult<ListMembershipOpportunitiesResponse>> ListMembershipOpportunitiesAsync(ListMembershipOpportunitiesRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/ListMembershipOpportunities", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<ListMembershipOpportunitiesResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<ListMembershipOpportunitiesResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<ListMembershipOpportunitiesResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Removes an application to join a group
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> RemoveGroupApplicationAsync(RemoveGroupApplicationRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/RemoveGroupApplication", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Removes an invitation join a group
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> RemoveGroupInvitationAsync(RemoveGroupInvitationRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/RemoveGroupInvitation", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Removes members from a group.
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> RemoveMembersAsync(RemoveMembersRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/RemoveMembers", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Sets the global title access policy
        /// </summary>
        public static async Task<PlayFabResult<SetGlobalPolicyResponse>> SetGlobalPolicyAsync(SetGlobalPolicyRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Profile/SetGlobalPolicy", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<SetGlobalPolicyResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<SetGlobalPolicyResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<SetGlobalPolicyResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Sets objects on an entity's profile.
        /// </summary>
        public static async Task<PlayFabResult<SetObjectsResponse>> SetObjectsAsync(SetObjectsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Object/SetObjects", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<SetObjectsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<SetObjectsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<SetObjectsResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Sets the profiles access policy
        /// </summary>
        public static async Task<PlayFabResult<SetEntityProfilePolicyResponse>> SetProfilePolicyAsync(SetEntityProfilePolicyRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Profile/SetProfilePolicy", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<SetEntityProfilePolicyResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<SetEntityProfilePolicyResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<SetEntityProfilePolicyResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Unblocks a list of entities from joining a group
        /// </summary>
        public static async Task<PlayFabResult<EmptyResult>> UnblockEntityAsync(UnblockEntityRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/UnblockEntity", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<EmptyResult> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<EmptyResult>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<EmptyResult> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Updates non-membership data about a group.
        /// </summary>
        public static async Task<PlayFabResult<UpdateGroupResponse>> UpdateGroupAsync(UpdateGroupRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/UpdateGroup", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<UpdateGroupResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<UpdateGroupResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<UpdateGroupResponse> { Result = result, CustomData = customData };
        }

        /// <summary>
        /// Updates metadata about a role.
        /// </summary>
        public static async Task<PlayFabResult<UpdateGroupRoleResponse>> UpdateRoleAsync(UpdateGroupRoleRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabSenderHelper.DoPost("/Group/UpdateRole", request, "X-EntityToken", PlayFabSettings.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<UpdateGroupRoleResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = JsonWrapper.DeserializeObject<PlayFabJsonSuccess<UpdateGroupRoleResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<UpdateGroupRoleResponse> { Result = result, CustomData = customData };
        }

    }
}
