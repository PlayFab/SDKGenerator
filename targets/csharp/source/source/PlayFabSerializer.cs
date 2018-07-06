using PlayFab.Json;

namespace PlayFab
{
    public class PlayFabSerializer: ISerializerPlugin
    {
        /// <summary>
        /// Serializes a data object.
        /// </summary>
        /// <param name="object">The data object.</param>
        /// <returns>Serialized object in string form.</returns>
        public string SerializeObject<T>(T @object)
        {
            return JsonWrapper.SerializeObject(@object);
        }

        /// <summary>
        /// Deserializes a data object.
        /// </summary>
        /// <typeparam name="T">The type of the data object.</typeparam>
        /// <param name="serializedObject">The serialized object in string form.</param>
        /// <returns>The data object.</returns>
        public T DeserializeObject<T>(string serializedObject)
        {
            return JsonWrapper.DeserializeObject<T>(serializedObject);
        }
    }
}
