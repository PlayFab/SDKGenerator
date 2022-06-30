using Kusto.Data;
using Kusto.Data.Common;
using Kusto.Ingest;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;

namespace JenkinsConsoleUtility.Util
{
    public class AdoBuildResultRow
    {
        public string jobname;
        public int passed;
        public int failed;
        public int other;
        public int total;
        public DateTime timestamp;

        public AdoBuildResultRow(string jobname, int passed, int failed, int other, int total, DateTime timestamp)
        {
            this.jobname = jobname;
            this.passed = passed;
            this.failed = failed;
            this.other = other;
            this.total = total;
            this.timestamp = timestamp;
        }
    }

    public class KustoConfig
    {
        // Defined externally
        public string clusterUri;
        public string dbName;
        public string tableName;
        public string clientId;
        public string secretKey;

        // Dependent or constant
        public string mappingName { get { return tableName + "_Mapping"; } }
        public readonly string authority = "microsoft.onmicrosoft.com";
    }

    public class KustoWriter
    {
        KustoConfig config;
        public KustoWriter(KustoConfig config)
        {
            this.config = config;
        }

        /// <summary>
        /// Performs a write to the indicated table, sending the appropriately filtered test report to Kusto
        /// Returns the number of lines written
        /// Skips the final write step when testing
        /// </summary>
        public bool WriteDataForTable(bool testing, List<AdoBuildResultRow> reports)
        {
            try
            {
                // Create Kusto connection string with App Authentication
                var kustoConnectionStringBuilderEngine =
                    new KustoConnectionStringBuilder(config.clusterUri).WithAadApplicationKeyAuthentication(
                        applicationClientId: config.clientId,
                        applicationKey: config.secretKey,
                        authority: config.authority);

                using (var ingestClient = KustoIngestFactory.CreateDirectIngestClient(kustoConnectionStringBuilderEngine))
                {
                    var ingestProps = new KustoQueuedIngestionProperties(config.dbName, config.tableName);
                    // For the sake of getting both failure and success notifications we set this to IngestionReportLevel.FailuresAndSuccesses
                    // Usually the recommended level is IngestionReportLevel.FailuresOnly
                    ingestProps.ReportLevel = IngestionReportLevel.FailuresAndSuccesses;
                    ingestProps.ReportMethod = IngestionReportMethod.Queue;
                    ingestProps.IngestionMapping = new IngestionMapping { IngestionMappingReference = config.mappingName };
                    ingestProps.Format = DataSourceFormat.json;

                    // Prepare data for ingestion
                    using (var memStream = new MemoryStream())
                    using (var writer = new StreamWriter(memStream))
                    {
                        foreach (AdoBuildResultRow eachReport in reports)
                        {
                            writer.WriteLine(JsonConvert.SerializeObject(eachReport));
                            Console.WriteLine($"Writing: {eachReport.jobname}, ({eachReport.passed}/{eachReport.failed}/{eachReport.other}/{eachReport.total}) for {eachReport.timestamp}");
                        }

                        writer.Flush();
                        memStream.Seek(0, SeekOrigin.Begin);

                        // Post ingestion message
                        if (!testing)
                        {
                            StreamSourceOptions options = new StreamSourceOptions();
                            options.LeaveOpen = true;
                            ingestClient.IngestFromStream(memStream, ingestProps, options);
                        }
                    }
                }
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine($"ERROR: Could not write to: {config.clusterUri}.{config.dbName}.{config.tableName}, using Mapping: {config.mappingName}");
                Console.WriteLine(e.ToString());
                return false;
            }
        }
    }
}
