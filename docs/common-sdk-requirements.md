# Requirements for the Common SDK infrastructure
The purpose of this doc is to have a place to list and discuss all requirements to the new modular SDK infrastructure (also informally called "the Common SDK infrastructure") before creating an official design.

The information listed here was primarily sourced in a few meetings/discussions/whiteboardings we had before.

## Terminology
* _Common SDK_ is the new modular SDK. 
* _Service_ is a single building unit (module) of the new modular SDK. TODO: please let me know if another term is desired for this.

## Requirements
### Requirements to the SDK
* Greater degree of flexibility and scalability in development, maintenance, customization and extensibility due to:
    * Non-monolithic, modular structure
    * Smaller building blocks (services) that can be worked on independently
    * High configurability (configuration-driven design)
* Configurable composition:
    * Services can be selected
    * Services can be optional
    * Services can be required
    * Composition rules/restrictions apply based on each service dependencies and configuration
    * Configuration errors must be prevented/communicated at the time of configuring
* Ability to tailor SDK to specific customer needs
* Can be composed and configured by a customer
* Trackable SDK generation and download process to provide acceptable customer experience
* Can be used to support all existing SDK platforms
* Can be integrated into existing SDK generation process (eventually replace generation of monolithic SDKs)
* Support of built-in (authored by PlayFab) and custom services (created by customers)
* Service management/administration system (for PlayFab admins)
* Well-defined and easy new service development process
* Well-defined and easy new service registration process

### Requirements to a service
* Contains metadata (description of itself that can be read by the system)
* Configurable (a set of properties that can be set/modified by the system or customer):
    * When selecting the service before generating and downloading SDK (SDK design time)
    * When adjusting the service locally after SDK is downloaded (client code build time or runtime)
* Can be developed independently of other services
* Can interact with other services using:
    * Specific service identifiers (reference to a specific service)
    * Configurable aliases (via configuration)
* Not limited by nature (not necessarily part of an existing SDKs, it can be anything)
