#include <stdafx.h>

#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabTransportHeaders.h>

namespace PlayFab
{
    PlayFabPluginManager& PlayFabPluginManager::GetInstance()
    {
        static PlayFabPluginManager instance;
        return instance;
    }

    PlayFabPluginManager::PlayFabPluginManager()
    {
    }

    void PlayFabPluginManager::SetPlugin(std::shared_ptr<IPlayFabPlugin> plugin, const PlayFabPluginContract contract, const std::string& instanceName)
    {
        GetInstance().SetPluginInternal(std::move(plugin), contract, instanceName);
    }

    void PlayFabPluginManager::SetPluginInstance(std::shared_ptr<IPlayFabPlugin> plugin, const PlayFabPluginContract contract, const std::string& instanceName)
    {
        SetPluginInternal(std::move(plugin), contract, instanceName);
    }

    std::shared_ptr<IPlayFabPlugin> PlayFabPluginManager::GetPluginInternal(const PlayFabPluginContract contract, const std::string& instanceName)
    {
        const auto key = std::make_pair(contract, instanceName);
        auto pluginEntry = plugins.find(key);
        if (pluginEntry == plugins.end())
        {
            // Requested plugin is not in the cache, create the default one
            std::shared_ptr<IPlayFabPlugin> pluginPtr = nullptr;
            switch (contract)
            {
            case PlayFabPluginContract::PlayFab_Serializer:
                pluginPtr = CreatePlayFabSerializerPlugin();
                break;
            case PlayFabPluginContract::PlayFab_Transport:
                if (instanceName == PlayFab::PLUGIN_TRANSPORT_ONEDS)
                    pluginPtr = CreateOneDSTransportPlugin();
                else
                    pluginPtr = CreatePlayFabTransportPlugin();
                break;
            default:
                throw std::runtime_error("This contract is not supported");
                break;
            }

            plugins.insert({ key, pluginPtr });
            return pluginPtr;
        }
        else
        {
            return pluginEntry->second;
        }
    }

    void PlayFabPluginManager::SetPluginInternal(std::shared_ptr<IPlayFabPlugin> plugin, const PlayFabPluginContract contract, const std::string& instanceName)
    {
        const auto key = std::make_pair(contract, instanceName);
        auto pluginEntry = plugins.find(key);
        if (pluginEntry == plugins.end())
        {
            plugins.insert({ key, std::move(plugin) });
        }
        else
        {
            plugins.erase(key);
            plugins.insert({ key, std::move(plugin) });
        }
    }

    std::shared_ptr<IPlayFabPlugin> PlayFabPluginManager::CreatePlayFabSerializerPlugin()
    {
        return std::make_shared<IPlayFabSerializerPlugin>();
    }

    std::shared_ptr<IPlayFabPlugin> PlayFabPluginManager::CreatePlayFabTransportPlugin()
    {
#ifdef PLAYFAB_PLATFORM_XBOX
        return std::make_shared<PlayFabIXHR2HttpPlugin>();
#elif defined(PLAYFAB_PLATFORM_WINDOWS)
        return std::make_shared<PlayFabWinHttpPlugin>();
#elif defined(PLAYFAB_PLATFORM_IOS)
        return std::make_shared<PlayFabIOSHttpPlugin>();
#else
        return std::make_shared<PlayFabCurlHttpPlugin>();
#endif // PLAYFAB_PLATFORM_XBOX
    }

    std::shared_ptr<IPlayFabPlugin> PlayFabPluginManager::CreateOneDSTransportPlugin()
    {
#ifdef PLAYFAB_PLATFORM_XBOX
        return std::make_shared<OneDSIXHR2Plugin>();
#elif defined(PLAYFAB_PLATFORM_WINDOWS)
        return std::make_shared<OneDSWinHttpPlugin>();
#elif defined(PLAYFAB_PLATFORM_IOS)
        return std::make_shared<OneDSIOSHttpPlugin>();
#else
        return std::make_shared<OneDSCurlHttpPlugin>();
#endif // PLAYFAB_PLATFORM_XBOX
    }

    void PlayFabPluginManager::HandleException(const std::exception ex)
    {
        { // LOCK userExceptionCallbackMutex
            std::unique_lock<std::mutex> lock(userExceptionCallbackMutex);
            if (userExceptionCallback)
            {
                userExceptionCallback(ex);
            }
        } // UNLOCK userExceptionCallbackMutex
    }

    void PlayFabPluginManager::SetExceptionHandler(ExceptionCallback exceptionCallback)
    {
        { // LOCK userExceptionCallbackMutex
            std::unique_lock<std::mutex> lock(userExceptionCallbackMutex);
            userExceptionCallback = exceptionCallback;
        } // UNLOCK userExceptionCallbackMutex
    }
}
