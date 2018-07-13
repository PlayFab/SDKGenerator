#if !DISABLE_PLAYFABCLIENT_API

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab.UUnit
{
    public class PluginManagerTest : UUnitTestCase
    {
        private class CustomSerializerPlugin : ISerializerPlugin
        {
            public T DeserializeObject<T>(string serialized)
            {
                throw new NotImplementedException();
            }

            public T DeserializeObject<T>(string serialized, object serializerStrategy)
            {
                throw new NotImplementedException();
            }

            public object DeserializeObject(string serialized)
            {
                throw new NotImplementedException();
            }

            public string SerializeObject(object obj)
            {
                throw new NotImplementedException();
            }

            public string SerializeObject(object obj, object serializerStrategy)
            {
                throw new NotImplementedException();
            }
        }

        private class CustomTransportPlugin : ITransportPlugin
        {
            public string Name;

            public async Task<object> DoPost(string urlPath, object request, Dictionary<string, string> headers)
            {
                throw new NotImplementedException();
            }
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that plugin manager returns default plugins if they are not set.
        /// </summary>
        [UUnitTest]
        public void PluginManagerDefaultPlugins(UUnitTestContext testContext)
        {
            var playFabSerializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
            var playFabTransport = PluginManager.GetPlugin<ITransportPlugin>(PluginContract.PlayFab_Transport);

            testContext.NotNull(playFabSerializer);
            testContext.NotNull(playFabTransport);
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that plugin manager can set and return a custom plugin.
        /// </summary>
        [UUnitTest]
        public void PluginManagerCustomPlugin(UUnitTestContext testContext)
        {
            var playFabSerializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
            var customSerializer = new CustomSerializerPlugin();
            try
            {
                // Set a custom serializer plugin
                PluginManager.SetPlugin(customSerializer, PluginContract.PlayFab_Serializer);

                // Get serializer plugin from manager
                var serializerPlugin = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);

                // Verify
                testContext.True(object.ReferenceEquals(serializerPlugin, customSerializer));
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception e)
            {
                testContext.EndTest(UUnitFinishState.FAILED, e.ToString());
            }
            finally
            {
                // Restore the original plugin
                PluginManager.SetPlugin(playFabSerializer, PluginContract.PlayFab_Serializer);
            }
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that plugin manager can set and return mupltiple plugins per contract.
        /// </summary>
        [UUnitTest]
        public void PluginManagerMultiplePluginsPerContract(UUnitTestContext testContext)
        {
            const string customTransportName1 = "Custom transport client 1";
            const string customTransportName2 = "Custom transport client 2";

            var playFabTransport = PluginManager.GetPlugin<ITransportPlugin>(PluginContract.PlayFab_Transport);
            var customTransport1 = new CustomTransportPlugin() { Name = customTransportName1 };
            var customTransport2 = new CustomTransportPlugin() { Name = customTransportName2 };

            // Set a custom plugins
            PluginManager.SetPlugin(customTransport1, PluginContract.PlayFab_Transport, customTransportName1);
            PluginManager.SetPlugin(customTransport2, PluginContract.PlayFab_Transport, customTransportName2);

            // Verify 
            var transport = PluginManager.GetPlugin<ITransportPlugin>(PluginContract.PlayFab_Transport);
            testContext.True(object.ReferenceEquals(transport, playFabTransport)); // the default one is still the same
            var transport1 = PluginManager.GetPlugin<ITransportPlugin>(PluginContract.PlayFab_Transport, customTransportName1);
            testContext.True(object.ReferenceEquals(transport1, customTransport1));
            var transport2 = PluginManager.GetPlugin<ITransportPlugin>(PluginContract.PlayFab_Transport, customTransportName2);
            testContext.True(object.ReferenceEquals(transport2, customTransport2));
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
#endif
