using System;
using System.Collections.Generic;
using System.Text;

namespace PlayFab
{
    static class CollectionUtils
    {
        /// <summary>
        /// Adds a string value to a dictionary if that value is not null or empty
        /// </summary>
        /// <param name="dictionary">The dictionary we're adding to</param>
        /// <param name="key">The key to add</param>
        /// <param name="value">The value to add, if not null</param>
        /// <returns>True if the value was added, false otherwise</returns>
        public static bool AddIfNotNullOrEmpty(this IDictionary<string, string> dictionary, string key, string value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                dictionary[key] = value;
                return true;
            }

            return false;
        }
    }
}
