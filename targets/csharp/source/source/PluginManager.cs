using System;
using System.Collections.Generic;

namespace PlayFab
{
    public class PluginManager
    {
        private Dictionary<Tuple<PluginContract, string>, IPlayFabPlugin> plugins = new Dictionary<Tuple<PluginContract, string>, IPlayFabPlugin>();

        /// <summary>
        /// The singleton instance of plugin manager.
        /// </summary>
        public static PluginManager Instance { get; private set; } = new PluginManager();

        private PluginManager()
        {
        }

        /// <summary>
        /// Gets a plugin.
        /// If a plugin with specified contract and optional instance name does not exist, it will create a new one.
        /// </summary>
        /// <param name="contract">The plugin contract.</param>
        /// <param name="instanceName">The optional plugin instance name.</param>
        /// <returns>The plugin instance.</returns>
        public IPlayFabPlugin GetPlugin(PluginContract contract, string instanceName = "")
        {
            var key = new Tuple<PluginContract, string>(contract, instanceName);
            if (!this.plugins.ContainsKey(key))
            {
                IPlayFabPlugin plugin;
                switch (contract)
                {
                    case PluginContract.PlayFab_Serializer:
                        plugin = new PlayFabSerializer();
                        break;
                    case PluginContract.PlayFab_Transport:
                        plugin = new PlayFabTransport();
                        break;
                    default:
                        throw new ArgumentException("This contract is not supported", nameof(contract));
                }

                this.plugins[key] = plugin;
            }

            return this.plugins[key];
        }

        /// <summary>
        /// Sets a custom plugin.
        /// If a plugin with specified 
        /// </summary>
        /// <param name="plugin">The plugin instance.</param>
        /// <param name="contract">The app contract of plugin.</param>
        /// <param name="instanceName">The optional plugin instance name.</param>
        public void SetPlugin(IPlayFabPlugin plugin, PluginContract contract, string instanceName = "")
        {
            var key = new Tuple<PluginContract, string>(contract, instanceName);
            this.plugins[key] = plugin;
        }
    }
}