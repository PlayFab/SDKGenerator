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
        public static IPlayFabPlugin GetPlugin(PluginContract contract, string instanceName = "")
        {
            return Instance.GetPluginInternal(contract, instanceName);
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
                IPlayFabPlugin plugin;
                switch (contract)
                {
                    case PluginContract.PlayFab_Serializer:
                        plugin = this.CreatePlugin<ISerializerPlugin>();
                        break;
                    case PluginContract.PlayFab_Transport:
                        plugin = this.CreatePlugin<ITransportPlugin>();
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

        private I CreatePlugin<I>() where I: class, IPlayFabPlugin
        {
            var interfaceType = typeof(I);
            var types = this.GetType().GetAssembly().GetTypes();
            I plugin = null;
            foreach (var eachType in types)
            {
                if (interfaceType.IsAssignableFrom(eachType) && !eachType.IsAbstract)
                {
                    if (plugin == null)
                    {
                        plugin = (I)Activator.CreateInstance(eachType.AsType());
                    }
                    else
                    {
                        throw new PlayFabException(PlayFabExceptionCode.PluginAmbiguity, "Found more than one implementation of " + nameof(I) + ". Please call PluginManager.SetPlugin(...) to set a specific implementation before using other public PlayFab API.");
                    }
                }
            }

            if (plugin == null)
            {
                throw new PlayFabException(PlayFabExceptionCode.PluginNotFound, "Cannot find a valid " + nameof(I) + " type");
            }

            return plugin;
        }
    }
}