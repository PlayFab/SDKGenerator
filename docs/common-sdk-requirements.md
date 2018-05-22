# Requirements for the Common SDK infrastructure
The purpose of this doc is to have a place to list and discuss all requirements to the new modular SDK infrastructure (also informally called "the Common SDK infrastructure") before creating an official design.

The information listed here was primarily sourced in a few meetings/discussions/whiteboardings we had before.

## Terminology
* _Common SDK_ is the new modular SDK. 
* _Service_ is a single building unit (module) of the new modular SDK. TODO: please let me know if another term is desired for this.

## Requirements
### Requirements to the SDK
* Non-monolithic, modular structure that allows a greater degree of flexibility and scalability in development, maintenance, customization and extensibility due to smaller building blocks (services) that can be worked independently
* Consists of services
* Configurable composition:
    * Services can be selected
    * Services can be optional
    * Services can be required
    * Composition rules/restrictions apply based on each service dependencies and configuration
    * Configuration errors must be prevented/communicated at the time of configuring
* Can be composed and configured by a customer
* Tracked SDK generation process for acceptable customer experience
* Support of PlayFab-built and custom services (created by customers)

### Requirements to a service
* Contains metadata (description of itself)
* Configurable
* Can be developed independently
* Can interact with other services using:
    * Specific service identifiers
    * Configurable aliases (via configuration)
* Not limited by nature (not only a part of existing SDKs)
