#pragma once

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabError.h>
#include <unordered_map>

// Intellisense-only includes
#include <curl/curl.h>

namespace PlayFab
{
    /// <summary>
    /// The enumeration of supported plugin contracts.
    /// </summary>
    enum class PlayFabPluginContract
    {
        PlayFab_Serializer,
        PlayFab_Transport
    };

    /// <summary>
    /// Interface of any PlayFab SDK plugin.
    /// </summary>
    class IPlayFabPlugin
    {
    };

    /// <summary>
    /// Interface of any transport SDK plugin.
    /// </summary>
    class IPlayFabHttpPlugin : public IPlayFabPlugin
    {
        virtual void AddRequest(std::string url, std::unordered_map<std::string, std::string> headers, SharedVoidPointer callback, ErrorCallback errorCallback = nullptr, void* extrabuffer = nullptr);
    };

    /// <summary>
    /// Interface of any data serializer SDK plugin.
    /// </summary>
    class IPlayFabSerializerPlugin : public IPlayFabPlugin
    {
    };

    /// <summary>
    /// The PlayFab plugin manager.
    /// </summary>
    class PlayFabPluginManager
    {
    public:
        static PlayFabPluginManager& instance(); // The singleton instance of plugin manager

        // Prevent copy/move construction
        PlayFabPluginManager(const PlayFabPluginManager&) = delete;
        PlayFabPluginManager(PlayFabPluginManager&&) = delete;

        // Prevent copy/move assignment operations
        PlayFabPluginManager& operator=(const PlayFabPluginManager&) = delete;
        PlayFabPluginManager& operator=(PlayFabPluginManager&&) = delete;

        // Gets a plugin.
        // If a plugin with specified contract and optional instance name does not exist, it will create a new one.
        template <typename T>
        static T& GetPlugin(const PlayFabPluginContract& contract, const std::string& instanceName = "")
        {
            return (T&)(instance().GetPluginInternal(contract, instanceName));
        }

        // Sets a custom plugin.
        // If a plugin with specified contract and optional instance name already exists, it will be replaced with specified instance.
        static void SetPlugin(IPlayFabPlugin& plugin, const PlayFabPluginContract& contract, const std::string& instanceName = "");
    private:
        IPlayFabPlugin& GetPluginInternal(const PlayFabPluginContract& contract, const std::string& instanceName);
        void SetPluginInternal(IPlayFabPlugin& plugin, const PlayFabPluginContract& contract, const std::string& instanceName);

        IPlayFabPlugin* CreatePlayFabSerializerPlugin();
        IPlayFabPlugin* CreatePlayFabTransportPlugin();

        // Private constructor and destructor
        PlayFabPluginManager() = default;
        ~PlayFabPluginManager() = default;

        std::map<const std::pair<const PlayFabPluginContract, const std::string>, IPlayFabPlugin&> plugins;
    };
}
