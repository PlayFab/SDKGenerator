using PlayFab.Internal;

namespace PlayFab
{
    public class PluginManager
    {
        public static PluginManager Instance { get; private set; } = new PluginManager();

        private PluginManager()
        {
            // initialize with configuration
            // . . .
        }

        public object GetPluginBySettingKey(string settingKey)
        {
            string id = null;

            // get plugin ids from configuration settings
            
            if (settingKey == "plugin-sender")
            {
                id = "pf-sender";
            }

            return this.GetPlugin(id);
        }

        public object GetPlugin(string id)
        {
            switch (id)
            {
                case "pf-sender":
                    {
                        return new PlayFabHttp();
                    }
                    break;
                default:
                    {
                        return null;
                    }
                    break;
            }
        }
    }
}