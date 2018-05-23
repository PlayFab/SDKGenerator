# Requirements for the Common SDK infrastructure
The purpose of this doc is to have a place to list and discuss all requirements to the new modular SDK infrastructure (also informally called "the Common SDK infrastructure") before creating an official design.

The information listed here was primarily sourced in a few meetings/discussions/whiteboardings we had before.

## Terminology
* _Common SDK infrastructure_ is the infrastructure necessary to build the new modular SDK.
* _Plugin_ is a minimal building block (module) of the new modular SDK (in our prior discussions we referred to it as a _service_).

## Requirements
### Requirements for the SDK and the infrastructure
* Greater degree of flexibility and scalability in development, maintenance, customization and extensibility due to:
    * Non-monolithic, modular structure
    * Smaller building blocks (plugins) that can be worked on independently
    * High configurability (configuration-driven design)
* Configurable composition:
    * Plugins can be selected
    * Plugins can be optional
    * Plugins can be required
    * Composition rules/restrictions apply based on each plugin dependencies and configuration
    * Configuration errors must be prevented/communicated at the time of configuring
* Ability to tailor SDK to specific customer needs
* Can be composed and configured by a customer
* Can be integrated into existing SDK generation process (eventually replace generation of monolithic SDKs)
* Can be used to support all existing SDK platforms:
    * Design is agnostic to any programming language used for plugin/SDK implementation
    * Interaction of a plugin with the Common SDK infrastructure should be very simple and supported on all platforms
* Plugin management:
    * Support of built-in (authored by PlayFab) and custom plugins (created by customers)
    * Plugin management/administration system (for PlayFab admins)
    * Public plugin distrubution/publishing channels (future PlayFab plugin marketplace, popular package databases like nuget, npm, maven, etc)
    * Well-defined and easy new plugin development process
    * Well-defined and easy new plugin registration process. External parties/customers should be able to do that.
* Customer experience:
    * Trackable SDK generation and download process to provide acceptable customer experience
    * If a customer is registered at PlayFab and logged in, their SDK configuration profile(s) will be saved in their account. If not, they should still be able to generate and download the SDK but their configuration profile will not be persisted on PlayFab web site (we can show a warning)

### Requirements for a plugin
* Contains metadata (description that can be read by the system)
* Configurable (a set of properties that can be set/modified by the system or customer):
    * When selecting the plugin before generating and downloading SDK (SDK design time)
    * When adjusting the plugin locally after SDK is downloaded (client code at build time or runtime)
* Can be developed independently of other plugins
* Can interact with other plugins using:
    * Specific unique plugin identifiers (reference to a specific plugin)
    * Configurable aliases (via configuration)
* Can be used by other plugins (by a unique plugin identifier)
* Can provide implementations in different programming languages for multiple platforms:
    * Author of plugin can choose which languages/platforms to support and declares it in the plugin metadata
    * No limitations in language-specific constructs/patterns used for plugin implementations
* While not strictly limited, commonly used plugins should be the least common denominator for the specific platform and minimize dependencies on additional packages/libraries, using standard/core/plain platform APIs where possible to increase compatibility of the plugin with different environments.
* Not limited by nature (not necessarily to be part of any existing SDKs, it can be anything)
