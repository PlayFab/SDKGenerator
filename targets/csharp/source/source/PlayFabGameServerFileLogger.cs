////////////////////////////////////////////////
// Copyright (C) Microsoft. All rights reserved.
////////////////////////////////////////////////

// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace PlayFab.GSDK
{
    internal interface ILogger
    {
        void Start();
        void Stop();
        void Log(string message);
    }

    internal static class LoggerFactory
    {
        public static ILogger CreateInstance(string logFolder)
        {
            return new FileSystemLogger(logFolder);
        }
    }

    internal class FileSystemLogger : ILogger
    {
        private StreamWriter _logWriter;
        private string _logFolder;

        public FileSystemLogger(string logFolder)
        {
            _logFolder = logFolder;
        }

        public void Log(string message)
        {
            if (_logWriter == null)
            {
                return; // Logging is disabled
            }

            _logWriter.WriteLine($"{DateTime.UtcNow.ToString("o")}\t{message}");
            _logWriter.Flush();
        }

        public void Start()
        {
            if (_logWriter != null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(_logFolder))
            {
                _logFolder = Environment.CurrentDirectory;
            }

            if (!Directory.Exists(_logFolder))
            {
                Directory.CreateDirectory(_logFolder);
            }

            long datePart = DateTime.UtcNow.ToFileTime();
            string fileName = Path.Combine(_logFolder, $"GSDK_output_{datePart}.txt");
            _logWriter = new StreamWriter(File.OpenWrite(fileName));
        }

        public void Stop()
        {
            _logWriter?.Dispose();
            _logWriter = null;
        }
    }
}
#endif