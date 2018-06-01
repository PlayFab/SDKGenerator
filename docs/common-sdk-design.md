# Common SDK infrastructure dev design
The purpose of this doc is to serve as a guidance for software engineers to implement a solution defined below as "the common SDK infrastructure". It contains basic analysis of the problem, proposal for improvements, goals, requirements, architecture and a list of technical challenges with suggestions for implementation.

## Problem analysis
There is nothing fundamentally wrong with current PlayFab SDKs and the SDK generation process. They are technically designed and implemented well, relatively simple, efficient and address most of our today's customers' needs. The simplicity of current implementation - while being a powerful benefit - also has a cost. There are certain limitations that may be standing in a way of even greater adoption of the platform by customers with specific needs or extending business opportunities provided by the platform:
* Monolithic, one-for-all formation of current SDKs results in:
    * Limited configurability (ability to select which components are needed or should be excluded from the SDK)
    * Limited customization options (ability to easily replace standard components with custom ones in the SDK)
    * Limited extensibility (ability to easily add new external functionality to the SDK)
* No possibility to build a custom SDK
* No easy and configurable way to:
    * Use an alternative service platform (e.g. a different data ingestion system)
    * Use a different network transport/protocol (unless already built in the SDK)
    * Use different elements of data processing stack on the client side (e.g. specific data formatting, serialization, compression, encryption)
    * Use alternative client-side API
*  No diversity in available solutions (beside a single SDK (per client platform) and REST API) that would allow a wider spectrum of integration options with PlayFab services (think of a "marketplace" of various solutions created by PlayFab and third parties, that would allow users to choose the breadth and the depth of interaction with PlayFab platform)

## Solution
Many limitations listed above can be addressed by a set of improvements in SDKs themselves and in the process of their generation:

* SDKs:
    * Modular composition (SDK consists of smaller building blocks - _plugins_)
    * Dynamic formation (plugins can be removed, added, replaced) based on SDK configuration
    * Custom plugins (created by users) are allowed
    * Plugins can interact with other plugins

* SDK generation process:
    * SDKs are not directly downloaded from a single designated git repo as one-for-all content anymore. Instead, they become customer-specific content that can be personally designed from plugins, configured, packaged and then downloaded by user.
    * The SDK generation consists of two separate processes:
        * _Plugin Generator_ (similar to the current SDK Generator but generates plugins instead of whole SDKs. Each plugin is stored in its own git repo (similarly as a whole SDK now))
        * _Common SDK Builder_ (with user's SDK configuration as an input it assembles a custom SDK from plugins, generates some "gluing" code that allows plugins to interoperate, packages it up as a complete SDK with source code and project files and prepares it as downloadable content for user)
    * An existing PlayFab SDK is split into multiple plugins, e.g. the "API layer" and the "data sender" (network transport client) (granularity is TBD, it can be an evolving process that may later add plugins for data batching, encryption, compression, logging, etc)
    * Custom plugins can be authored by third parties and are stored in individual git repos (similar to PlayFab's plugins)
    * Each plugin has identification and dependencies metadata

* Additional systems and services:
    * Registry of plugins (a maintainable/curated list of repos with supported plugins). This is used by the Common SDK Builder.
    * UX (e.g. a web page) that allows a customer to build, configure and download an SDK assembled from plugins
    * UX and a process that allows a customer to register their custom plugins
    * UX and a process to maintain a "marketplace" of available plugins accessible to customers

* Additional offerings:
    * Common SDK Builder can potentially be productized as a library available for distrubutuion - a tool that would allow customers to generate SDKs on the fly in their automation processes.

## Goals
The goals of the proposed solution are:
* Addressing the limitations of current SDKs
* Expanding the value and business opportunities of PlayFab service platform
* Increasing the adoption rate and MAU of PlayFab service platform
* Gradual implementation as a supplement to the existing SDK system (adding features of the new Common SDK infrastructure to production side by side with already existing system)
* Gradual replacement of the current SDK system with the Common SDK infrastructure in areas justified by a proven business impact
* Relatively low cost of implementation
* Be as simple as possible while providing enough flexibility to support all target platforms

## Definition
* _Common SDK infrastructure_ is a system of tools and processes necessary to build the new custom modular SDK. It is meant to supplement the existing SDK Generator tool and associated processes.
* _Plugin_ is a minimal building block (module) of the new modular SDK (in some prior discussions we also referred to it as a _service_).

## Requirements
### Requirements for the infrastructure
* Low implementation cost
* Ability to integrate with existing SDK generation process in a supplemental, non-destructive way
* Can be used to support all existing SDK target platforms:
    * Design is agnostic to any programming language used for plugin/SDK implementation
    * Interaction of a plugin with other plugins should be very simple and supported on all platforms
    * "Plugin manager" is a new API provided for every target platform that allows plugins to interoperate (get references/pointers/objects (depending on a platform/programming language) to/of other plugins)
* Plugin management:
    * Support of built-in (authored by PlayFab) and custom plugins (created by customers)
    * Well-defined and easy plugin development process
    * Well-defined and easy plugin registration process. External parties/customers should be able to do that.
    * Registered plugins are stored as source code in git repos, each plugin in its own repo (alternative options may be added in the future: nugets, npm, maven, etc)
* Customer experience:
    * Trackable SDK generation and download process to provide acceptable customer experience
    * If a customer is registered at PlayFab and logged in, their SDK configuration profile(s) will be saved in their account. If not, they should still be able to generate and download the SDK but their configuration profile will not be persisted on PlayFab web site (we can show a warning)

### Requirements for an SDK
* Greater degree of flexibility and scalability in development, maintenance, customization and extensibility due to:
    * Non-monolithic, modular structure
    * Smaller building blocks (plugins) that can be worked on independently
    * High configurability (configuration-driven design)
* Flexible composition:
    * Plugins can be selected
    * Plugins can be optional
    * Plugins can be required
    * Composition rules/restrictions apply based on each plugin dependencies and configuration
    * Configuration errors must be prevented/communicated at the time of configuring
* Ability to tailor SDK to specific customer needs
* Can be composed and configured by a customer

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
    * No limitations in language-specific constructs/patterns used in plugin implementations
* While not strictly limited, commonly used plugins should be the least common denominator for the specific platform and minimize dependencies on additional packages/libraries, using standard/core/plain platform APIs where possible to increase compatibility of the plugin with different environments.
* Not limited by nature (not necessarily to be part of any existing SDKs, it can be anything)

## Architecture
### Modular SDK diagram
The new modular SDK consists of loosely coupled plugins. Each plugin may call other plugins depending on the logic of interaction with external world that the plugin's author implemented. 

This doc is not focusing on any particular design for managing data flow or plugin execution sequence leaving it mostly to plugin/SDK developers, but it provides just enough basic intrumentation that should be flexible enough to implement any interaction model or data flow management as needed. For example, by adding a "coordinator" plugin that all other plugins may call to determine what to do next, the possibilities are nearly limitless.

Access to other plugins is provided by _Plugin Manager_ API that will be included in the _Common Client library_ available for every platform supported by PlayFab. Plugin/SDK developers can use that library in their plugin code when a connectivity with another plugin is needed. It is provided via a reference, pointer, object, etc - depending on the programming language and platform - that it gets from Plugin Manager by specifying another plugin's unique identifer. The unique identifier doesn't have to be hard-coded, it can be a configuration setting that can be set later - when an SDK is assembled from plugins and the settings for each plugin can be configured. This will allow customer to choose compatible plugins later, at the SDK configuration phase rather than having them hard-coded directly.

An example of the new modular SDK and its plugin call sequence is shown below (the SDK is depicted in orange color). Please note that the "Batching" plugin is this example is optional, it won't be called by the "Data Validator" if Plugin Manager couldn't provide access to the "Batching" plugin because it was not included in a custom SDK. In that case, "Data Validator" will be calling Serializer directly and passing its data to it:

![Modular SDK and plugin call sequence](/docs/images/modular-sdk-call-sequence-diagram.svg)

The content of the modular SDK demonstrated above is shown below. This is what customers download after configuring and assembling their SDK:
```
<SDK root>/
    <Solution and Project files (e.g. .sln, .vcxproj, .csproj, .njsproj, etc - depends on the platform)>
    plugins/
        API/
            <source code, headers or binaries (depends on the platform and plugin distribution model)>
        DataValidator/
            <source code, headers or binaries (depends on the platform and plugin distribution model)>
        Batching/
            <source code, headers or binaries (depends on the platform and plugin distribution model)>
        Serializer/
            <source code, headers or binaries (depends on the platform and plugin distribution model)>
        NetworkTransport/
            <source code, headers or binaries (depends on the platform and plugin distribution model)>
    CommonClientLib/
        PluginManager/
            <source code of Plugin Manager, some parts of it are dynamically generated 
            when SDK is assembled and downloaded>
```
Some plugins (e.g. API) are meant to be called directly by customers from their app code. When any public methods of such plugins are called they would typically check if they already have references to other plugins that they need - and use Plugin Manager to get those references as needed (an alternative model could be to have an initialization method for each plugin that should be called before an SDK can be used - TBD).

When requested of a reference Plugin Manager executes a piece of code provided by the author of the requested plugin. In most cases (depending on the platform and/or programming language) it will be a line of code that instantiates an object of plugin's class and returns a reference/pointer to it, but it can also be a static method that returns a singleton - or really anything that makes sense for a particular platform, semantics of a programming language and plugin cardinality chosen by its author. These lines of code for each selected plugin are inserted into the source code of Plugin Manager when it is dynamically generated based on SDK configuration before the SDK is assembled and downloaded.

### Common SDK infrastructure diagram
The new SDK generation process will supplement existing one by adding two additional systems:
* Plugin Generator (addition to current SDK generator)
* Common SDK Builder (new component)

A diagram of the new process is shown below followed by a description:

![Common SDK infrastructure diagram](/docs/images/common-sdk-infrastructure-diagram.svg)
### Process
The new SDK generation process consists of the following steps:
1. Plugin generation

    The purpose of this step is to generate all PlayFab plugins that a new PlayFab SDK consists of, pretty much the same way as any current (legacy) PlayFab SDK is generated now. You can think of each plugin as a "mini-legacy-SDK" in that regard. Plugin Generator will be using largely the same code as (maybe even share the same code with) the current SDK Generator and the same principles of content generation from source code and templates. The only difference is that the result is a set of plugins (each in its own repo) instead of a single SDK (in its own repo). This approach gives the following benefits:

    * Each plugin is generated by already existing tools, using well-tested mechanics and technologies. In many cases it will also be using all necessary options that are required for a particular SDK (e.g. Client, Server and Combined flavors)
    * Each plugin is relatively autonomous, it may even have its own project files and be buildable independently
    * Each plugin may have its nuspec (or other package spec file) that will allow it to be packaged and exported/distributed via a public package repository (nuget, npm, maven, etc)
    * It may potentially be built and distributed as a binary

    Plugin Generator can be implemented as an additional step in the current SDK generation process that can be triggered by using additional process parameters (command line switches). Once this process is complete all PlayFab plugins for a chosen target platform are updated/created in their git repos.

2. SDK configuration

    In its final "production" form the SDK configuration process may look like an advanced UX experience in which customer assembles an SDK from compatible plugins of their choice and then sets or changes a number of settings for each plugin. This is out of scope of this doc and SDK configuration will simply be presented by a JSON file with a schema that allows to describe adjustable aspects of the SDK and each plugin (like plugin settings). The outcome of the future UX experience will be creation of such a file based on customer's selection.

3. SDK assembling and packaging

    This step requires a new component called "Common SDK Builder" in SDK generation process, its purpose is to assemble a whole SDK using a number of inputs: SDK configuration file, source code or binaries of selected plugins pulled from their git repos, Common Client library (Plugin Manager), some code generated dynamically based on SDK configuration, solution project files, SDK settings files, etc. The assembled SDK can be optionally packaged in a form suitable for download (e.g. a zip file).

    The Common SDK Builder is a step that runs after Legacy-SDK/Plugin Generator as it uses the content of plugin repos created/updated by Plugin Generator. Since this will be a new separate tool it can be implemented using the same technologies as current Legacy-SDK Generator (e.g. TypeScript, ejs-templates) or C#/.NET/T4-templates (TBD).

4. Delivery/Download options

    This step assumes a process that allows customer to get an assembled SDK. Since the new SDK is a custom modular product tailored to the needs of a particular customer (i.e. it will be different for each unique configuration) it generally can't or shouldn't have a single designated shared location that everyone can download from (we still can publish some popular solutions for all, of course).

    This is out of scope of this doc and at this moment the Common SDK Builder will simply store assembled SDK in the directory of choice that must be specified in SDK configuration file.

## Challenges / Technical Details
The sections below describe some technical challenges and proposed solutions.

### Plugin identification and metadata
Each plugin needs metadata - a description of itself in a convenient technical form - that the Common SDK infrastructure can use to work with plugins. For example, it can be a JSON file (like `descriptor.json`) authored by plugin developer that resides in a designated place of a plugin (e.g. the root of it's content/source code). The metadata includes permanent properties of a plugin like:

* Unique identifier (e.g. some GUID)
* Version
* Human-friendly name
* Human-friendly text that describes plugin
* Dependencies
* List of configurable settings with their default values
* List of supported platforms
* etc ...

A hypothetical example of plugin "pf-api" that has a hard dependency on plugin "pf-common" (more about hard dependencies please see below), a configuration setting named "plugin-sender" that it will use for a soft dependency on any _sender_ plugin (more about soft dependencies please see below), a list of platforms that it supports (C#):
```json
{
    "id": "pf-api",
    "version": "1.0.0.0",
    "name": "PlayFab Entity API",
    "description": "The layer of a PlayFab SDK that customers call from their app code",
    "dependencies": [ "pf-common" ],
    "configurationSettingKeys": [
        {
            "key": "plugin-sender",
            "defaultValue": "pf-sender"
        }
    ],
    "targets": [
        {
            "name": "CSharpSDK"
        }
    ]
}
```
An example of descriptors of other related plugins:
```json
{
    "id": "pf-common",
    "dependencies": [],
    "configurationSettingKeys": [],
    "targets": [
        {
            "name": "CSharpSDK"
        }
    ]
}
```
```json
{
    "id": "pf-sender",
    "dependencies": [ "pf-common" ],
    "configurationSettingKeys": [],
    "targets": [
        {
            "name": "CSharpSDK",
            "code": {
                "headerInclude": "using PlayFab.PfSender;",
                "callCreate": "return new PlayFabHttp();"
            }
        }
    ]
}
```

### Configuration
When customer desings an SDK they select plugins and configure them. The configuration options include, for example, plugin settings.

In the example of an SDK configuration file below (`configuration.json`) two plugins ("pf-api" and "pf-sender") were selected by customer and then tied together by setting "plugin-sender" key in configuration of plugin "pf-api" to the value "pf-sender". The SDK configuration file is used by the Common SDK Builder to generate some part of Plugin Manager code. With that setting "pf-api" will be able to request Plugin Manager to get access to the right sender plugin (by passing the name of the setting - "plugin-sender" - as a parameter), without knowing which specific plugin it would be at the time when "pf-api" is developed. The id of a specific dependency plugin is specified at the time of SDK configuration:
```json
{
    "plugins": [
        {
            "id": "pf-api",
            "configuration":
            {
                "settings": [
                    {
                        "key": "plugin-sender",
                        "value": "pf-sender"
                    }
                ]
            }
        },
        {
            "id": "pf-sender",
            "configuration":
            {
                "settings": []
            }
        }
    ]
}
```
Please note that SDK configuration is used only by the Common SDK Builder to assemble and package an SDK, but it is not included in the packaged SDK itself as it is not used on the client app side. The downloaded SDK code is already composed and generated in a way that it doesn't require the SDK configuration file anymore. It is the result of processing of the SDK configuration file. This doesn't preclude, of course, plugins or the SDK from using some settings or other means of configurability on the client app side if needed, but those are separate from this concept (a lot of that already exists, like Unity Editor settings for Unity SDK). They shouldn't be confused with the SDK configuration described above.

### Dependencies
Dependencies are a very important aspect of any modular design, and chances are very high this will evolve over time. Many plugins will need to use external libraries, API, or simply share some code with other plugins. For example, interfaces, base classes, commmon data structs in languages like C#, Java or C++ that multiple plugins within one SDK can use and even exchange with each other as parameters. Having separate libraries and/or copies of these components in each plugin will not always work well or even be possible, depending on the platform. In many languages exactly the same semantical unit declared in two different places is considered two different things so it can't be used that way for communication between plugins.

#### Hard dependencies
Hard dependencies are defined in plugin's metadata, its descriptor file. They instruct the Common SDK Builder to pull these dependencies (as source code or binaries, like any other plugin) and include them in the assembled SDK so that other plugins can directly reference them in source code. Initially only other plugins can be supported as hard dependencies but later other types can be added: external packages (nugets, npm, maven, etc), compiled libraries/assemblies, etc (TBD).

#### Soft dependencies
Soft dependencies are references to other plugins that a plugin can get via Plugin Manager API. The key distinction from a hard dependency is that a specific id of a referenced plugin is not known at the development time. Plugin developer can use a configuration setting to get it from Plugin Manager like this:

```csharp
IPlayFabSender sender = (IPlayFabSender)PluginManager.GetPluginBySettingKey("plugin-sender");
```

Note that `IPlayFabSender` interface in this case could be defined, for example, in some shared plugin ("pf-common") that is used as a hard dependency in both "pf-api" and "pf-sender" plugins. That lets them use that interface directly in their source code (as any other semantic units/classes/files located in "pf-common").

Some parts of Plugin Manager's code are generated by the Common SDK Builder using SDK configuration so that Plugin Manager knows how to return the right plugin back to the caller:

1. The id of a requested plugin is determined by code generated from this part of SDK configuration (note the value):
```json
    ...
            "id": "pf-api",
            "configuration":
            {
                "settings": [
                    {
                        "key": "plugin-sender",
                        "value": "pf-sender"
                    }
                ]
            }
    ...
```
for example in C#:
```csharp
// the block of code below is generated using SDK configuration:
if (settingKey == "plugin-sender")
{
    requestedPluginId = "pf-sender";
}
```

2. The requested plugin itself ("pf-sender") is returned by code generated from this part of the descriptor of "pf-sender" (note the values of properties "headerInclude" and "callCreate"):
```json
    ...
            "name": "CSharpSDK",
            "code": {
                "headerInclude": "using PlayFab.PfSender;",
                "callCreate": "return new PlayFabHttp();"
            }
    ...
```
for example:
```csharp
// the header inclusion below is generated using the metadata descriptor of a plugin (headerInclude property):
using PlayFab.PfSender;

...
// other Plugin Manager's code
...

// the line below is a part of a function that returns a requested plugin,
// it is generated using the metadata descriptor of the plugin (callCreate property):
return new PlayFabHttp();
```

### Custom plugins
Each custom plugin can be an independent software project in its own git repo with certain regulations applied (so that the Common SDK Builder can find and pull out plugin's relevant source code when assembling an SDK that uses that plugin).

### Testability
* Each generated PlayFab plugin can and should be tested, in a similar way that current SDKs are tested.
* Testing an assembled modular SDK can be challenging. It can be done for some popular compositions published for all, the same way current SDKs are tested.

    Testing truly custom SDKs end-to-end may not be immediately possible since such SDKs may contain virtually any functionality, including custom code.

### Security
The concept of modular SDKs with support of custom plugins brings some security risks that must be taken into consideration. We will need processes or solutions addressing that. For the most part this is out of scope of this design doc as it merely focuses on technical possibilities of modular SDKs and their generation process. TBD.