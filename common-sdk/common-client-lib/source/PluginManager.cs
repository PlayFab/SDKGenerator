

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
            // get plugin id from settings
            return this.GetPlugin(settingKey);
        }

        public object GetPlugin(string id)
        {
            switch (id)
            {
                case "plugin-sender":
                    {
                        return null;
                    }
                    break;
                case "2":
                    {
                        return null;
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
