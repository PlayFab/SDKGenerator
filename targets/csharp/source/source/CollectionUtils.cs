using System;
using System.Collections.Generic;
using System.Text;

namespace PlayFab
{
    static class CollectionUtils
    {
        public static void AddIfNotNullOrEmpty(this IDictionary<string, string> dictionary, string key, string value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                dictionary[key] = value;
            }
        }
    }
}
