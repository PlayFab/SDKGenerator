using System;
using System.Collections.Generic;
using PlayFab.Internal;
using PlayFab.Json;

namespace PlayFab
{
    public class PluginManager
    {
        private Dictionary<Tuple<PluginContract, string>, IPlayFabPlugin> plugins = new Dictionary<Tuple<PluginContract, string>, IPlayFabPlugin>();

        /// <summary>
        /// The singleton instance of plugin manager.
        /// </summary>
        private static readonly PluginManager Instance = new PluginManager();

        private PluginManager()
        {
        }

        /// <summary>
        /// Gets a plugin.
        /// If a plugin with specified contract and optional instance name does not exist, it will create a new one.
        /// </summary>
        /// <param name="contract">The plugin contract.</param>
        /// <param name="instanceName">The optional plugin instance name. Instance names allow to have mulptiple plugins with the same contract.</param>
        /// <returns>The plugin instance.</returns>
        public static T GetPlugin<T>(PluginContract contract, string instanceName = "") where T : IPlayFabPlugin
        {
            return (T)Instance.GetPluginInternal(contract, instanceName);
        }

        /// <summary>
        /// Sets a custom plugin.
        /// If a plugin with specified contract and optional instance name already exists, it will be replaced with specified instance.
        /// </summary>
        /// <param name="plugin">The plugin instance.</param>
        /// <param name="contract">The app contract of plugin.</param>
        /// <param name="instanceName">The optional plugin instance name. Instance names allow to have mulptiple plugins with the same contract.</param>
        public static void SetPlugin(IPlayFabPlugin plugin, PluginContract contract, string instanceName = "")
        {
            Instance.SetPluginInternal(plugin, contract, instanceName);
        }

        private IPlayFabPlugin GetPluginInternal(PluginContract contract, string instanceName)
        {
            var key = new Tuple<PluginContract, string>(contract, instanceName);
            if (!this.plugins.ContainsKey(key))
            {
                // Requested plugin is not in the cache, create the default one
                IPlayFabPlugin plugin;
                switch (contract)
                {
                    case PluginContract.PlayFab_Serializer:
                        plugin = this.CreatePlugin<SimpleJsonInstance>();
                        break;
                    case PluginContract.PlayFab_Transport:
                        plugin = this.CreatePlayFabTransportPlugin();
                        break;
                    default:
                        throw new ArgumentException("This contract is not supported", nameof(contract));
                }

                this.plugins[key] = plugin;
            }

            return this.plugins[key];
        }

        private void SetPluginInternal(IPlayFabPlugin plugin, PluginContract contract, string instanceName)
        {
            if (plugin == null)
            {
                throw new ArgumentNullException(nameof(plugin), "Plugin instance cannot be null");
            }

            var key = new Tuple<PluginContract, string>(contract, instanceName);
            this.plugins[key] = plugin;
        }

        private IPlayFabPlugin CreatePlugin<T>() where T : IPlayFabPlugin, new()
        {
            return (IPlayFabPlugin)Activator.CreateInstance(typeof(T).AsType());
        }

        private ITransportPlugin CreatePlayFabTransportPlugin()
        {
            var httpInterfaceType = typeof(ITransportPlugin);
            var types = typeof(PlayFabHttp).GetAssembly().GetTypes();
            foreach (var eachType in types)
            {
                if (httpInterfaceType.IsAssignableFrom(eachType) && !eachType.IsAbstract)
                {
                    return (ITransportPlugin)Activator.CreateInstance(eachType.AsType());
                }
            }

            throw new Exception("Cannot find a valid ITransportPlugin type");
        }
    }
}