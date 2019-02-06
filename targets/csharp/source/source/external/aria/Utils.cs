using System;

// This is part of Aria SDK

namespace Microsoft.Applications.Events
{
    class Utils
    {
        /// <summary>
        /// Calculates milliseconds since 1970
        /// </summary>
        /// <returns>Milliseconds since 1970</returns>
        public static long TimestampNow()
        {
            return (DateTime.UtcNow.Ticks - (new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).Ticks)) / 10000;
        }

        /// <summary>
        /// Calculates milliseconds since 1970
        /// </summary>
        /// <returns>Milliseconds since 1970</returns>
        public static long TimestampNowTicks()
        {
            return DateTime.UtcNow.Ticks;
        }

        public static string TenantID(string tenant)
        {
            try
            {
                var endIndex = tenant.IndexOf("-", StringComparison.Ordinal);
                var tenantId = string.Empty;
                if (endIndex > 0)
                    return tenantId = tenant.Substring(0, endIndex);
            }
            catch
            {
                // TODO: log this ("Failed to convert tenantId")
            }

            return string.Empty;
        }
    }
}
