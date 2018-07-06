namespace PlayFab
{
    /// <summary>
    /// Interface of any data serializer SDK plugin.
    /// </summary>
    public interface ISerializerPlugin: IPlayFabPlugin
    {
        /// <summary>
        /// Serializes a data object.
        /// </summary>
        /// <param name="object">The data object.</param>
        /// <returns>Serialized object in string form.</returns>
        string SerializeObject<T>(T @object);

        /// <summary>
        /// Deserializes a data object.
        /// </summary>
        /// <typeparam name="T">The type of the data object.</typeparam>
        /// <param name="serializedObject">The serialized object in string form.</param>
        /// <returns>The data object.</returns>
        T DeserializeObject<T>(string serializedObject);
    }
}