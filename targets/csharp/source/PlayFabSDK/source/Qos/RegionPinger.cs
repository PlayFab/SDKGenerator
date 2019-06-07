#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using MultiplayerModels;
#if NET45 || NETCOREAPP2_0
    using System.Net;
    using System.Net.Sockets;
#endif

    public class RegionPinger
    {
        private const int PingCount = 5;
        private const int PortNumber = 3075;
        private const int UnknownLatencyValue = int.MaxValue;
        private readonly byte[] _initialHeader = { 0xFF, 0xFF };
        private readonly byte[] _subsequentHeader = { 0x00, 0x00 };
        private readonly string _hostNameOrAddress;
        private readonly AzureRegion _region;

        public RegionPinger(string hostNameOrAddress, AzureRegion region)
        {
            _hostNameOrAddress = hostNameOrAddress;
            _region = region;
        }

        public async Task<QosRegionResult> PingAsync(int timeoutMs)
        {
            Task timeout = Task.Delay(timeoutMs);
            var latencyMeasures = new List<Task<int>>(PingCount);
            for (int i = 0; i < PingCount; i++)
            {
                latencyMeasures.Add(PingInternalAsync());
            }

            await Task.WhenAny(Task.WhenAll(latencyMeasures), timeout);
            var latencies = new List<int>(latencyMeasures.Count);
            int errorCode = 0;
            foreach (Task<int> measure in latencyMeasures)
            {
                if (!measure.IsCompleted || measure.Result < 0)
                {
                    errorCode = (int) QosErrorCode.Timeout;
                    continue;
                }

                latencies.Add(measure.Result);
            }

            int averageLatency = UnknownLatencyValue;
            if (latencies.Count > 0)
            {
                long sum = 0;
                foreach (int latency in latencies)
                {
                    sum += latency;
                }

                averageLatency = (int)(sum / latencies.Count);
            }

            // Return the average of the remaining numbers
            return new QosRegionResult
            {
                Region = _region,
                LatencyMs = averageLatency,
                ErrorCode = errorCode
            };
        }

        private async Task<int> PingInternalAsync()
        {
#if NET45 || NETCOREAPP2_0
            IPHostEntry hostEntry = await Dns.GetHostEntryAsync(_hostNameOrAddress);
            using (var client = new UdpClient(hostEntry.HostName, PortNumber))
            {
                long startTicks = DateTime.UtcNow.Ticks;
                byte[] startTicksBytes = BitConverter.GetBytes(startTicks);
                byte[] requestBuffer = new byte[_initialHeader.Length + startTicksBytes.Length];
                _initialHeader.CopyTo(requestBuffer, 0);
                startTicksBytes.CopyTo(requestBuffer, _initialHeader.Length);

                await client.SendAsync(requestBuffer, requestBuffer.Length);

                UdpReceiveResult udpReceiveResult = await client.ReceiveAsync();
                long endTicks = DateTime.UtcNow.Ticks;

                if (VerifyResponseBuffer(udpReceiveResult.Buffer, startTicks))
                {
                    long result = (endTicks - startTicks) / TimeSpan.TicksPerMillisecond;

                    if (result < int.MaxValue)
                    {
                        return (int)result;
                    }
                }
            }

            return UnknownLatencyValue;
#else
            return await Task.FromResult(UnknownLatencyValue);
#endif
        }

        private bool VerifyResponseBuffer(byte[] header, long ticks)
        {
            if (header.Length < _subsequentHeader.Length)
            {
                return false;
            }

            for (int i = 0; i < _subsequentHeader.Length; i++)
            {
                if (header[i] != _subsequentHeader[i])
                {
                    return false;
                }
            }

            return BitConverter.ToInt64(header, _subsequentHeader.Length) == ticks;
        }
    }
}
#endif
