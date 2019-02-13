////////////////////////////////////////////////
// Copyright (C) Microsoft. All rights reserved.
////////////////////////////////////////////////

// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using PlayFab;

namespace PlayFabAllSDK.Uunit
{
    public class GameServerConfigFileHelper
    {
        private GameServerConfigFileHelper(ISerializerPlugin jsonSerializer) { }

        public async static Task WrapAsync<T>(ISerializerPlugin jsonSerializer, T objRef, Func<string, Task> doWorkAsync)
        {
            string testConfigFileName = Path.ChangeExtension(Path.GetTempFileName(), ".json");

            using (var writer = new StreamWriter(testConfigFileName))
            {
                writer.WriteLine(jsonSerializer.SerializeObject(objRef));
                writer.Flush();
            }

            try
            {
                await doWorkAsync(testConfigFileName);
            }
            catch (Exception)
            {
                using (var reader = new StreamReader(testConfigFileName))
                {
                    Console.WriteLine();
                    Console.WriteLine("*******************************************");
                    Console.WriteLine("  FAILED TEST CONFIGURATION FILE CONTENTS  ");
                    Console.WriteLine("*******************************************");
                    Console.WriteLine(reader.ReadToEnd());
                    Console.WriteLine();
                    Console.WriteLine();
                }

                throw;
            }
            finally
            {
                try
                {
                    File.Delete(testConfigFileName);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Could not delete the temp file {testConfigFileName}: \r\n\r\n{ex}");
                }
            }
        }
    }
}
#endif