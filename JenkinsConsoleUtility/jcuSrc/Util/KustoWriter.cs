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

    public static class KustoWriter
    {
        const string CLUSTER_URI = "https://sdktestreporting.westus2.kusto.windows.net";
        const string APPLICATION_CLIENT_ID = "1baa0fc5-b746-4b84-8184-a4298750fb51";
        const string APPLICATION_SECRET = "5=u6C4PCa?j:8OwG_3PEAP3PwYjBg@-[";

        const string DATABASE_NAME = "SdkTestReportingDb";
        const string ADO_RESULTS_TABLE_NAME = "SDK_Ado_Results";

        /// <summary>
        /// Performs a write to the indicated table, sending the appropriately filtered test report to Kusto
        /// Returns the number of lines written
        /// Skips the final write step when testing
        /// </summary>
        public static void WriteDataForTable(bool testing, List<AdoBuildResultRow> reports)
        {
            string mappingName = ADO_RESULTS_TABLE_NAME + "_Mapping";

            try
            {
                // Create Kusto connection string with App Authentication
                var kustoConnectionStringBuilderEngine =
                    new KustoConnectionStringBuilder(CLUSTER_URI).WithAadApplicationKeyAuthentication(
                        applicationClientId: APPLICATION_CLIENT_ID,
                        applicationKey: APPLICATION_SECRET,
                        authority: "microsoft.onmicrosoft.com");

                using (var ingestClient = KustoIngestFactory.CreateDirectIngestClient(kustoConnectionStringBuilderEngine))
                {
                    var ingestProps = new KustoQueuedIngestionProperties(DATABASE_NAME, ADO_RESULTS_TABLE_NAME);
                    // For the sake of getting both failure and success notifications we set this to IngestionReportLevel.FailuresAndSuccesses
                    // Usually the recommended level is IngestionReportLevel.FailuresOnly
                    ingestProps.ReportLevel = IngestionReportLevel.FailuresAndSuccesses;
                    ingestProps.ReportMethod = IngestionReportMethod.Queue;
                    ingestProps.IngestionMapping = new IngestionMapping { IngestionMappingReference = mappingName };
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
                            ingestClient.IngestFromStream(memStream, ingestProps, leaveOpen: true);
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"ERROR: Could not write to Table: {ADO_RESULTS_TABLE_NAME}, using Mapping: {mappingName}");
                Console.WriteLine(e.ToString());
            }
        }
    }
}
