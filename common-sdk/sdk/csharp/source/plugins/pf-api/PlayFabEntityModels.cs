using System;
using System.Collections.Generic;

namespace PlayFab.EntityModels
{
    public class AbortFileUploadsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Names of the files to have their pending uploads aborted.
        /// </summary>
        public List<string> FileNames;

        /// <summary>
        /// The expected version of the profile, if set and doesn't match the current version of the profile the operation will not
        /// be performed.
        /// </summary>
        public int? ProfileVersion;

    }

    public class AbortFileUploadsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

    }

    public class AcceptGroupApplicationRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Optional. Type of the entity to accept as. If specified, must be the same entity as the claimant or an entity that is a
        /// child of the claimant entity. Defaults to the claimant entity.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class AcceptGroupInvitationRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class AddMembersRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// List of entities to add to the group. Only entities of type title_player_account and character may be added to groups.
        /// </summary>
        public List<EntityKey> Members;

        /// <summary>
        /// Optional: The ID of the existing role to add the entities to. If this is not specified, the default member role for the
        /// group will be used. Role IDs must be between 1 and 64 characters long.
        /// </summary>
        public string RoleId;

    }

    public class ApplyToGroupRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Optional, default true. Automatically accept an outstanding invitation if one exists instead of creating an application
        /// </summary>
        public bool? AutoAcceptOutstandingInvite;

        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    /// <summary>
    /// Describes an application to join a group
    /// </summary>
    public class ApplyToGroupResponse : PlayFabResultCommon
    {
        /// <summary>
        /// Type of entity that requested membership
        /// </summary>
        public EntityWithLineage Entity;

        /// <summary>
        /// When the application to join will expire and be deleted
        /// </summary>
        public DateTime Expires;

        /// <summary>
        /// ID of the group that the entity requesting membership to
        /// </summary>
        public EntityKey Group;

    }

    public class BlockEntityRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class ChangeMemberRoleRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The ID of the role that the entities will become a member of. This must be an existing role. Role IDs must be between 1
        /// and 64 characters long.
        /// </summary>
        public string DestinationRoleId;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// List of entities to move between roles in the group. All entities in this list must be members of the group and origin
        /// role.
        /// </summary>
        public List<EntityKey> Members;

        /// <summary>
        /// The ID of the role that the entities currently are a member of. Role IDs must be between 1 and 64 characters long.
        /// </summary>
        public string OriginRoleId;

    }

    public enum CloudScriptRevisionOption
    {
        Live,
        Latest,
        Specific
    }

    public class CreateGroupRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The name of the group. This is unique at the title level by default.
        /// </summary>
        public string GroupName;

    }

    public class CreateGroupResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The ID of the administrator role for the group.
        /// </summary>
        public string AdminRoleId;

        /// <summary>
        /// The server date and time the group was created.
        /// </summary>
        public DateTime Created;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The name of the group.
        /// </summary>
        public string GroupName;

        /// <summary>
        /// The ID of the default member role for the group.
        /// </summary>
        public string MemberRoleId;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// The list of roles and names that belong to the group.
        /// </summary>
        public Dictionary<string,string> Roles;

    }

    public class CreateGroupRoleRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The ID of the role. This must be unique within the group and cannot be changed. Role IDs must be between 1 and 64
        /// characters long.
        /// </summary>
        public string RoleId;

        /// <summary>
        /// The name of the role. This must be unique within the group and can be changed later. Role names must be between 1 and
        /// 100 characters long
        /// </summary>
        public string RoleName;

    }

    public class CreateGroupRoleResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The current version of the group profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// ID for the role
        /// </summary>
        public string RoleId;

        /// <summary>
        /// The name of the role
        /// </summary>
        public string RoleName;

    }

    public class DeleteFilesRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Names of the files to be deleted.
        /// </summary>
        public List<string> FileNames;

        /// <summary>
        /// The expected version of the profile, if set and doesn't match the current version of the profile the operation will not
        /// be performed.
        /// </summary>
        public int? ProfileVersion;

    }

    public class DeleteFilesResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

    }

    public class DeleteGroupRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// ID of the group or role to remove
        /// </summary>
        public EntityKey Group;

    }

    public class DeleteRoleRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The ID of the role to delete. Role IDs must be between 1 and 64 characters long.
        /// </summary>
        public string RoleId;

    }

    public enum EffectType
    {
        Allow,
        Deny
    }

    public class EmptyResult : PlayFabResultCommon
    {
    }

    /// <summary>
    /// An entity object and its associated meta data.
    /// </summary>
    public class EntityDataObject
    {
        /// <summary>
        /// Un-escaped JSON object, if DataAsObject is true.
        /// </summary>
        public object DataObject;

        /// <summary>
        /// Escaped string JSON body of the object, if DataAsObject is default or false.
        /// </summary>
        public string EscapedDataObject;

        /// <summary>
        /// Name of this object.
        /// </summary>
        public string ObjectName;

    }

    /// <summary>
    /// Entity identifier class that contains both the ID and type.
    /// </summary>
    public class EntityKey
    {
        /// <summary>
        /// Entity profile ID.
        /// </summary>
        public string Id;

        /// <summary>
        /// Entity type. Optional to be used but one of EntityType or EntityTypeString must be set.
        /// </summary>
        public EntityTypes? Type;

        /// <summary>
        /// Entity type. Optional to be used but one of EntityType or EntityTypeString must be set.
        /// </summary>
        public string TypeString;

    }

    public class EntityMemberRole
    {
        /// <summary>
        /// The list of members in the role
        /// </summary>
        public List<EntityWithLineage> Members;

        /// <summary>
        /// The ID of the role.
        /// </summary>
        public string RoleId;

        /// <summary>
        /// The name of the role
        /// </summary>
        public string RoleName;

    }

    public class EntityPermissionStatement
    {
        /// <summary>
        /// The action this statement effects. May be 'Read', 'Write' or '*' for both read and write.
        /// </summary>
        public string Action;

        /// <summary>
        /// A comment about the statement. Intended solely for bookkeeping and debugging.
        /// </summary>
        public string Comment;

        /// <summary>
        /// Additional conditions to be applied for entity resources.
        /// </summary>
        public object Condition;

        /// <summary>
        /// The effect this statement will have. It may be either Allow or Deny
        /// </summary>
        public EffectType Effect;

        /// <summary>
        /// The principal this statement will effect.
        /// </summary>
        public object Principal;

        /// <summary>
        /// The resource this statements effects. Similar to 'pfrn:data--title![Title ID]/Profile/*'
        /// </summary>
        public string Resource;

    }

    public class EntityProfileBody
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The chain of responsibility for this entity. This is a representation of 'ownership'. It is constructed using the
        /// following formats (replace '[ID]' with the unique identifier for the given entity): Namespace: 'namespace![Namespace
        /// ID]' Title: 'title![Namespace ID]/[Title ID]' Master Player Account: 'master_player_account![Namespace
        /// ID]/[MasterPlayerAccount ID]' Title Player Account: 'title_player_account![Namespace ID]/[Title ID]/[MasterPlayerAccount
        /// ID]/[TitlePlayerAccount ID]' Character: 'character![Namespace ID]/[Title ID]/[MasterPlayerAccount
        /// ID]/[TitlePlayerAccount ID]/[Character ID]'
        /// </summary>
        public string EntityChain;

        /// <summary>
        /// The files on this profile.
        /// </summary>
        public Dictionary<string,EntityProfileFileMetadata> Files;

        /// <summary>
        /// The objects on this profile.
        /// </summary>
        public Dictionary<string,EntityDataObject> Objects;

        /// <summary>
        /// The permissions that govern access to this entity profile and its properties. Only includes permissions set on this
        /// profile, not global statements from titles and namespaces.
        /// </summary>
        public List<EntityPermissionStatement> Permissions;

        /// <summary>
        /// The version number of the profile in persistent storage at the time of the read. Used for optional optimistic
        /// concurrency during update.
        /// </summary>
        public int VersionNumber;

    }

    /// <summary>
    /// An entity file's meta data. To get a download URL call File/GetFiles API.
    /// </summary>
    public class EntityProfileFileMetadata
    {
        /// <summary>
        /// Checksum value for the file
        /// </summary>
        public string Checksum;

        /// <summary>
        /// Name of the file
        /// </summary>
        public string FileName;

        /// <summary>
        /// Last UTC time the file was modified
        /// </summary>
        public DateTime LastModified;

        /// <summary>
        /// Storage service's reported byte count
        /// </summary>
        public int Size;

    }

    public enum EntityTypes
    {
        title,
        master_player_account,
        title_player_account,
        character,
        group,
        service
    }

    /// <summary>
    /// Entity wrapper class that contains the entity key and the entities that make up the lineage of the entity.
    /// </summary>
    public class EntityWithLineage
    {
        /// <summary>
        /// The entity key for the specified entity
        /// </summary>
        public EntityKey Key;

        /// <summary>
        /// Dictionary of entity keys for related entities. Dictionary key is entity type.
        /// </summary>
        public Dictionary<string,EntityKey> Lineage;

    }

    public class ExecuteCloudScriptResult : PlayFabResultCommon
    {
        /// <summary>
        /// Number of PlayFab API requests issued by the CloudScript function
        /// </summary>
        public int APIRequestsIssued;

        /// <summary>
        /// Information about the error, if any, that occurred during execution
        /// </summary>
        public ScriptExecutionError Error;

        public double ExecutionTimeSeconds;

        /// <summary>
        /// The name of the function that executed
        /// </summary>
        public string FunctionName;

        /// <summary>
        /// The object returned from the CloudScript function, if any
        /// </summary>
        public object FunctionResult;

        /// <summary>
        /// Flag indicating if the FunctionResult was too large and was subsequently dropped from this event. This only occurs if
        /// the total event size is larger than 350KB.
        /// </summary>
        public bool? FunctionResultTooLarge;

        /// <summary>
        /// Number of external HTTP requests issued by the CloudScript function
        /// </summary>
        public int HttpRequestsIssued;

        /// <summary>
        /// Entries logged during the function execution. These include both entries logged in the function code using log.info()
        /// and log.error() and error entries for API and HTTP request failures.
        /// </summary>
        public List<LogStatement> Logs;

        /// <summary>
        /// Flag indicating if the logs were too large and were subsequently dropped from this event. This only occurs if the total
        /// event size is larger than 350KB after the FunctionResult was removed.
        /// </summary>
        public bool? LogsTooLarge;

        public uint MemoryConsumedBytes;

        /// <summary>
        /// Processor time consumed while executing the function. This does not include time spent waiting on API calls or HTTP
        /// requests.
        /// </summary>
        public double ProcessorTimeSeconds;

        /// <summary>
        /// The revision of the CloudScript that executed
        /// </summary>
        public int Revision;

    }

    public class ExecuteEntityCloudScriptRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The name of the CloudScript function to execute
        /// </summary>
        public string FunctionName;

        /// <summary>
        /// Object that is passed in to the function as the first argument
        /// </summary>
        public object FunctionParameter;

        /// <summary>
        /// Generate a 'entity_executed_cloudscript' PlayStream event containing the results of the function execution and other
        /// contextual information. This event will show up in the PlayStream debugger console for the player in Game Manager.
        /// </summary>
        public bool? GeneratePlayStreamEvent;

        /// <summary>
        /// Option for which revision of the CloudScript to execute. 'Latest' executes the most recently created revision, 'Live'
        /// executes the current live, published revision, and 'Specific' executes the specified revision. The default value is
        /// 'Specific', if the SpecificRevision parameter is specified, otherwise it is 'Live'.
        /// </summary>
        public CloudScriptRevisionOption? RevisionSelection;

        /// <summary>
        /// The specific revision to execute, when RevisionSelection is set to 'Specific'
        /// </summary>
        public int? SpecificRevision;

    }

    public class FinalizeFileUploadsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Names of the files to be finalized. Restricted to a-Z, 0-9, '(', ')', '_', '-' and '.'
        /// </summary>
        public List<string> FileNames;

    }

    public class FinalizeFileUploadsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Collection of metadata for the entity's files
        /// </summary>
        public Dictionary<string,GetFileMetadata> Metadata;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

    }

    public class GetEntityProfileRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Determines whether the objects will be returned as an escaped JSON string or as a un-escaped JSON object. Default is
        /// JSON string.
        /// </summary>
        public bool? DataAsObject;

        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

    }

    public class GetEntityProfileResponse : PlayFabResultCommon
    {
        /// <summary>
        /// Entity profile
        /// </summary>
        public EntityProfileBody Profile;

    }

    public class GetEntityProfilesRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Determines whether the objects will be returned as an escaped JSON string or as a un-escaped JSON object. Default is
        /// JSON string.
        /// </summary>
        public bool? DataAsObject;

        /// <summary>
        /// Entity keys of the profiles to load. Must be between 1 and 25
        /// </summary>
        public List<EntityKey> Entities;

    }

    public class GetEntityProfilesResponse : PlayFabResultCommon
    {
        /// <summary>
        /// Entity profiles
        /// </summary>
        public List<EntityProfileBody> Profiles;

    }

    public class GetEntityTokenRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

    }

    public class GetEntityTokenResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The token used to set X-EntityToken for all entity based API calls.
        /// </summary>
        public string EntityToken;

        /// <summary>
        /// The time the token will expire, if it is an expiring token, in UTC.
        /// </summary>
        public DateTime? TokenExpiration;

    }

    public class GetFileMetadata
    {
        /// <summary>
        /// Checksum value for the file
        /// </summary>
        public string Checksum;

        /// <summary>
        /// Download URL where the file can be retrieved
        /// </summary>
        public string DownloadUrl;

        /// <summary>
        /// Name of the file
        /// </summary>
        public string FileName;

        /// <summary>
        /// Last UTC time the file was modified
        /// </summary>
        public DateTime LastModified;

        /// <summary>
        /// Storage service's reported byte count
        /// </summary>
        public int Size;

    }

    public class GetFilesRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

    }

    public class GetFilesResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Collection of metadata for the entity's files
        /// </summary>
        public Dictionary<string,GetFileMetadata> Metadata;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

    }

    public class GetGlobalPolicyRequest : PlayFabRequestCommon
    {
    }

    public class GetGlobalPolicyResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The permissions that govern access to all entities under this title or namespace.
        /// </summary>
        public List<EntityPermissionStatement> Permissions;

    }

    public class GetGroupRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The full name of the group
        /// </summary>
        public string GroupName;

    }

    public class GetGroupResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The ID of the administrator role for the group.
        /// </summary>
        public string AdminRoleId;

        /// <summary>
        /// The server date and time the group was created.
        /// </summary>
        public DateTime Created;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The name of the group.
        /// </summary>
        public string GroupName;

        /// <summary>
        /// The ID of the default member role for the group.
        /// </summary>
        public string MemberRoleId;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// The list of roles and names that belong to the group.
        /// </summary>
        public Dictionary<string,string> Roles;

    }

    public class GetObjectsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Determines whether the object will be returned as an escaped JSON string or as a un-escaped JSON object. Default is JSON
        /// object.
        /// </summary>
        public bool? EscapeObject;

    }

    public class GetObjectsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Requested objects that the calling entity has access to
        /// </summary>
        public Dictionary<string,ObjectResult> Objects;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

    }

    /// <summary>
    /// Describes an application to join a group
    /// </summary>
    public class GroupApplication
    {
        /// <summary>
        /// Type of entity that requested membership
        /// </summary>
        public EntityWithLineage Entity;

        /// <summary>
        /// When the application to join will expire and be deleted
        /// </summary>
        public DateTime Expires;

        /// <summary>
        /// ID of the group that the entity requesting membership to
        /// </summary>
        public EntityKey Group;

    }

    /// <summary>
    /// Describes an entity that is blocked from joining a group.
    /// </summary>
    public class GroupBlock
    {
        /// <summary>
        /// The entity that is blocked
        /// </summary>
        public EntityWithLineage Entity;

        /// <summary>
        /// ID of the group that the entity is blocked from
        /// </summary>
        public EntityKey Group;

    }

    /// <summary>
    /// Describes an invitation to a group.
    /// </summary>
    public class GroupInvitation
    {
        /// <summary>
        /// When the invitation will expire and be deleted
        /// </summary>
        public DateTime Expires;

        /// <summary>
        /// The group that the entity invited to
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The entity that created the invitation
        /// </summary>
        public EntityWithLineage InvitedByEntity;

        /// <summary>
        /// The entity that is invited
        /// </summary>
        public EntityWithLineage InvitedEntity;

        /// <summary>
        /// ID of the role in the group to assign the user to.
        /// </summary>
        public string RoleId;

    }

    /// <summary>
    /// Describes a group role
    /// </summary>
    public class GroupRole
    {
        /// <summary>
        /// ID for the role
        /// </summary>
        public string RoleId;

        /// <summary>
        /// The name of the role
        /// </summary>
        public string RoleName;

    }

    /// <summary>
    /// Describes a group and the roles that it contains
    /// </summary>
    public class GroupWithRoles
    {
        /// <summary>
        /// ID for the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The name of the group
        /// </summary>
        public string GroupName;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// The list of roles within the group
        /// </summary>
        public List<GroupRole> Roles;

    }

    public class InitiateFileUploadMetadata
    {
        /// <summary>
        /// Name of the file.
        /// </summary>
        public string FileName;

        /// <summary>
        /// Location the data should be sent to via an HTTP PUT operation.
        /// </summary>
        public string UploadUrl;

    }

    public class InitiateFileUploadsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Names of the files to be set. Restricted to a-Z, 0-9, '(', ')', '_', '-' and '.'
        /// </summary>
        public List<string> FileNames;

        /// <summary>
        /// The expected version of the profile, if set and doesn't match the current version of the profile the operation will not
        /// be performed.
        /// </summary>
        public int? ProfileVersion;

    }

    public class InitiateFileUploadsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The entity id and type.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The current version of the profile, can be used for concurrency control during updates.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// Collection of file names and upload urls
        /// </summary>
        public List<InitiateFileUploadMetadata> UploadDetails;

    }

    public class InviteToGroupRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Optional, default true. Automatically accept an application if one exists instead of creating an invitation
        /// </summary>
        public bool? AutoAcceptOutstandingApplication;

        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// Optional. ID of an existing a role in the group to assign the user to. The group's default member role is used if this
        /// is not specified. Role IDs must be between 1 and 64 characters long.
        /// </summary>
        public string RoleId;

    }

    /// <summary>
    /// Describes an invitation to a group.
    /// </summary>
    public class InviteToGroupResponse : PlayFabResultCommon
    {
        /// <summary>
        /// When the invitation will expire and be deleted
        /// </summary>
        public DateTime Expires;

        /// <summary>
        /// The group that the entity invited to
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// The entity that created the invitation
        /// </summary>
        public EntityWithLineage InvitedByEntity;

        /// <summary>
        /// The entity that is invited
        /// </summary>
        public EntityWithLineage InvitedEntity;

        /// <summary>
        /// ID of the role in the group to assign the user to.
        /// </summary>
        public string RoleId;

    }

    public class IsMemberRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// Optional: ID of the role to check membership of. Defaults to any role (that is, check to see if the entity is a member
        /// of the group in any capacity) if not specified.
        /// </summary>
        public string RoleId;

    }

    public class IsMemberResponse : PlayFabResultCommon
    {
        /// <summary>
        /// A value indicating whether or not the entity is a member.
        /// </summary>
        public bool IsMember;

    }

    public class ListGroupApplicationsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class ListGroupApplicationsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The requested list of applications to the group.
        /// </summary>
        public List<GroupApplication> Applications;

    }

    public class ListGroupBlocksRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class ListGroupBlocksResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The requested list blocked entities.
        /// </summary>
        public List<GroupBlock> BlockedEntities;

    }

    public class ListGroupInvitationsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class ListGroupInvitationsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The requested list of group invitations.
        /// </summary>
        public List<GroupInvitation> Invitations;

    }

    public class ListGroupMembersRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// ID of the group to list the members and roles for
        /// </summary>
        public EntityKey Group;

    }

    public class ListGroupMembersResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The requested list of roles and member entity IDs.
        /// </summary>
        public List<EntityMemberRole> Members;

    }

    public class ListMembershipOpportunitiesRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

    }

    public class ListMembershipOpportunitiesResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The requested list of group applications.
        /// </summary>
        public List<GroupApplication> Applications;

        /// <summary>
        /// The requested list of group invitations.
        /// </summary>
        public List<GroupInvitation> Invitations;

    }

    public class ListMembershipRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

    }

    public class ListMembershipResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The list of groups
        /// </summary>
        public List<GroupWithRoles> Groups;

    }

    public class LogStatement
    {
        /// <summary>
        /// Optional object accompanying the message as contextual information
        /// </summary>
        public object Data;

        /// <summary>
        /// 'Debug', 'Info', or 'Error'
        /// </summary>
        public string Level;

        public string Message;

    }

    public class ObjectResult : PlayFabResultCommon
    {
        /// <summary>
        /// Un-escaped JSON object, if EscapeObject false or default.
        /// </summary>
        public object DataObject;

        /// <summary>
        /// Escaped string JSON body of the object, if EscapeObject is true.
        /// </summary>
        public string EscapedDataObject;

        /// <summary>
        /// Name of the object. Restricted to a-Z, 0-9, '(', ')', '_', '-' and '.'
        /// </summary>
        public string ObjectName;

    }

    public enum OperationTypes
    {
        Created,
        Updated,
        Deleted,
        None
    }

    public class RemoveGroupApplicationRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class RemoveGroupInvitationRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class RemoveMembersRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// List of entities to remove
        /// </summary>
        public List<EntityKey> Members;

        /// <summary>
        /// The ID of the role to remove the entities from.
        /// </summary>
        public string RoleId;

    }

    public class ScriptExecutionError
    {
        /// <summary>
        /// Error code, such as CloudScriptNotFound, JavascriptException, CloudScriptFunctionArgumentSizeExceeded,
        /// CloudScriptAPIRequestCountExceeded, CloudScriptAPIRequestError, or CloudScriptHTTPRequestError
        /// </summary>
        public string Error;

        /// <summary>
        /// Details about the error
        /// </summary>
        public string Message;

        /// <summary>
        /// Point during the execution of the script at which the error occurred, if any
        /// </summary>
        public string StackTrace;

    }

    public class SetEntityProfilePolicyRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The statements to include in the access policy.
        /// </summary>
        public List<EntityPermissionStatement> Statements;

    }

    public class SetEntityProfilePolicyResponse : PlayFabResultCommon
    {
        /// <summary>
        /// The permissions that govern access to this entity profile and its properties. Only includes permissions set on this
        /// profile, not global statements from titles and namespaces.
        /// </summary>
        public List<EntityPermissionStatement> Permissions;

    }

    public class SetGlobalPolicyRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The permissions that govern access to all entities under this title or namespace.
        /// </summary>
        public List<EntityPermissionStatement> Permissions;

    }

    public class SetGlobalPolicyResponse : PlayFabResultCommon
    {
    }

    public class SetObject
    {
        /// <summary>
        /// Body of the object to be saved. If empty and DeleteObject is true object will be deleted if it exists, or no operation
        /// will occur if it does not exist. Only one of Object or EscapedDataObject fields may be used.
        /// </summary>
        public object DataObject;

        /// <summary>
        /// Flag to indicate that this object should be deleted. Both DataObject and EscapedDataObject must not be set as well.
        /// </summary>
        public bool? DeleteObject;

        /// <summary>
        /// Body of the object to be saved as an escaped JSON string. If empty and DeleteObject is true object will be deleted if it
        /// exists, or no operation will occur if it does not exist. Only one of DataObject or EscapedDataObject fields may be used.
        /// </summary>
        public string EscapedDataObject;

        /// <summary>
        /// Name of object. Restricted to a-Z, 0-9, '(', ')', '_', '-' and '.'.
        /// </summary>
        public string ObjectName;

    }

    public class SetObjectInfo
    {
        /// <summary>
        /// Name of the object
        /// </summary>
        public string ObjectName;

        /// <summary>
        /// Optional reason to explain why the operation was the result that it was.
        /// </summary>
        public string OperationReason;

        /// <summary>
        /// Indicates which operation was completed, either Created, Updated, Deleted or None.
        /// </summary>
        public OperationTypes? SetResult;

    }

    public class SetObjectsRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// Optional field used for concurrency control. By specifying the previously returned value of ProfileVersion from
        /// GetProfile API, you can ensure that the object set will only be performed if the profile has not been updated by any
        /// other clients since the version you last loaded.
        /// </summary>
        public int? ExpectedProfileVersion;

        /// <summary>
        /// Collection of objects to set on the profile.
        /// </summary>
        public List<SetObject> Objects;

    }

    public class SetObjectsResponse : PlayFabResultCommon
    {
        /// <summary>
        /// New version of the entity profile.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// New version of the entity profile.
        /// </summary>
        public List<SetObjectInfo> SetResults;

    }

    public class UnblockEntityRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// The entity to perform this action on.
        /// </summary>
        public EntityKey Entity;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

    }

    public class UpdateGroupRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Optional: the ID of an existing role to set as the new administrator role for the group
        /// </summary>
        public string AdminRoleId;

        /// <summary>
        /// Optional field used for concurrency control. By specifying the previously returned value of ProfileVersion from the
        /// GetGroup API, you can ensure that the group data update will only be performed if the group has not been updated by any
        /// other clients since the version you last loaded.
        /// </summary>
        public int? ExpectedProfileVersion;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// Optional: the new name of the group
        /// </summary>
        public string GroupName;

        /// <summary>
        /// Optional: the ID of an existing role to set as the new member role for the group
        /// </summary>
        public string MemberRoleId;

    }

    public class UpdateGroupResponse : PlayFabResultCommon
    {
        /// <summary>
        /// Optional reason to explain why the operation was the result that it was.
        /// </summary>
        public string OperationReason;

        /// <summary>
        /// New version of the group data.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// Indicates which operation was completed, either Created, Updated, Deleted or None.
        /// </summary>
        public OperationTypes? SetResult;

    }

    public class UpdateGroupRoleRequest : PlayFabRequestCommon
    {
        /// <summary>
        /// Optional field used for concurrency control. By specifying the previously returned value of ProfileVersion from the
        /// GetGroup API, you can ensure that the group data update will only be performed if the group has not been updated by any
        /// other clients since the version you last loaded.
        /// </summary>
        public int? ExpectedProfileVersion;

        /// <summary>
        /// The identifier of the group
        /// </summary>
        public EntityKey Group;

        /// <summary>
        /// ID of the role to update. Role IDs must be between 1 and 64 characters long.
        /// </summary>
        public string RoleId;

        /// <summary>
        /// The new name of the role
        /// </summary>
        public string RoleName;

    }

    public class UpdateGroupRoleResponse : PlayFabResultCommon
    {
        /// <summary>
        /// Optional reason to explain why the operation was the result that it was.
        /// </summary>
        public string OperationReason;

        /// <summary>
        /// New version of the role data.
        /// </summary>
        public int ProfileVersion;

        /// <summary>
        /// Indicates which operation was completed, either Created, Updated, Deleted or None.
        /// </summary>
        public OperationTypes? SetResult;

    }
}
