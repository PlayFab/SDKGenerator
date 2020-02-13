#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Threading;
    using System.Threading.Tasks;
#if (NETSTANDARD && !NETSTANDARD1_1) || NETFRAMEWORK || NETCOREAPP
    using System.Net;
    using System.Net.Sockets;

    public class RegionPinger : IRegionPinger
    {
        private const int PortNumber = 3075;
        private const int UnknownLatencyValue = int.MaxValue;
        
        ///
        /// Need to have at least NumSuccessBeforeFilteringOutBestAndWorst successful results before filtering the
        /// best and worst results from the average that is reported
        ///
        private const int NumSuccessBeforeFilteringOutBestAndWorst = 4;

        private static readonly byte[] _initialPrefix = { 0xFF, 0xFF };
        private static readonly byte[] _subsequentPrefix = { 0x00, 0x00 };

        private readonly int _numTimeoutsForError;
        private readonly string _hostNameOrAddress;
        private readonly string _region;
        private readonly int _timeoutMs;

        private int _numTimeouts;
        private readonly List<int> latencyMeasures;

        public RegionPinger(string hostNameOrAddress, string region, int timeoutMs, int numTimeoutsForError,
            int expectedPingsPerRegion)
        {
            _hostNameOrAddress = hostNameOrAddress;
            _region = region;
            _timeoutMs = timeoutMs;
            _numTimeoutsForError = numTimeoutsForError;
            latencyMeasures = new List<int>(expectedPingsPerRegion);
        }

        public bool IsAtTimeoutThreshold()
        {
            return _numTimeouts >= _numTimeoutsForError;
        }

        public async Task PingAsync()
        {
            if (IsAtTimeoutThreshold())
            {
                return;
            }

            var sw = Stopwatch.StartNew();
            var ct = new CancellationTokenSource();
            Task timeout = Task.Delay(_timeoutMs, ct.Token);
            Task<int> pingResultTask = PingInternalAsync();

            await Task.WhenAny(pingResultTask, timeout);

            if (pingResultTask.IsCompleted)
            {
                ct.Cancel();
                int pingResultMs = await pingResultTask;

                lock (latencyMeasures)
                {
                    latencyMeasures.Add(pingResultMs);
                }
            }
            else
            {
                Interlocked.Increment(ref _numTimeouts);
            }
        }

        public QosRegionResult GetResult()
        {
            if (IsAtTimeoutThreshold())
            {
                return new QosRegionResult
                {
                    Region = _region,
                    LatencyMs = UnknownLatencyValue,
                    RawMeasurements = latencyMeasures,
                    NumTimeouts = _numTimeouts,
                    ErrorCode = (int)QosErrorCode.Timeout
                };
            }

            int averageLatency;
            QosErrorCode errorCode;

            lock (latencyMeasures)
            {
                if (latencyMeasures.Count > 0)
                {
                    long sum = 0;
                    int count = 0;
                    if (latencyMeasures.Count >= NumSuccessBeforeFilteringOutBestAndWorst)
                    {
                        // Throw out the top and bottom measurements 
                        latencyMeasures.Sort();
                        for (int i = 1; i < latencyMeasures.Count - 1; i++)
                        {
                            count++;
                            sum += latencyMeasures[i];
                        }
                    }
                    else
                    {
                        for (int i = 0; i < latencyMeasures.Count; i++)
                        {
                            count++;
                            sum += latencyMeasures[i];
                        }
                    }

                    errorCode = QosErrorCode.Success;
                    averageLatency = (int)(sum / count);
                }
                else
                {
                    errorCode = QosErrorCode.NoResult;
                    averageLatency = UnknownLatencyValue;
                }
            }

            return new QosRegionResult
            {
                Region = _region,
                LatencyMs = averageLatency,
                RawMeasurements = latencyMeasures,
                ErrorCode = (int)errorCode
            };
        }

        private async Task<int> PingInternalAsync()
        {
            IPHostEntry hostEntry = await Dns.GetHostEntryAsync(_hostNameOrAddress);
            using (var client = new UdpClient(hostEntry.HostName, PortNumber))
            {
                long startTicks = DateTime.UtcNow.Ticks;
                byte[] startTicksBytes = BitConverter.GetBytes(startTicks);
                byte[] requestBuffer = new byte[_initialPrefix.Length + startTicksBytes.Length];
                _initialPrefix.CopyTo(requestBuffer, 0);
                startTicksBytes.CopyTo(requestBuffer, _initialPrefix.Length);

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
        }

        private bool VerifyResponseBuffer(byte[] buffer, long ticks)
        {
            if (buffer.Length < _subsequentPrefix.Length)
            {
                return false;
            }

            for (int i = 0; i < _subsequentPrefix.Length; i++)
            {
                if (buffer[i] != _subsequentPrefix[i])
                {
                    return false;
                }
            }

            return BitConverter.ToInt64(buffer, _subsequentPrefix.Length) == ticks;
        }
    }
#else
    public class RegionPinger
    {
        public RegionPinger(string hostNameOrAddress, string region, int timeoutMs, int numTimeoutsForError,
            int expectedPingsPerRegion)
        {
        }

        public Task PingAsync()
        {
            throw new NotSupportedException("QoS ping library is only supported on .net standard 2.0 and newer, .net core or full .net framework");
        }

        public QosRegionResult GetResult()
        {
            throw new NotSupportedException("QoS ping library is only supported on .net standard 2.0 and newer, .net core or full .net framework");
        }
    }
#endif
}
#endif
