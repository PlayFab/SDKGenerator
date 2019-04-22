# XPlatCppSdk for Android

## QoS
QoS APIs are disabled from Android.

## How to use XPlatCppSdk in Android Project.
1. Import the XPlatCppSdk module to your android project.
  - Open **settings.gradle** file, and add below lines.
  ```
  include ':app'
  
  include 'xplatcppsdk'
  project(':xplatcppsdk').projectDir = new File('./path from your settings.gradle to XPlatCppSdk/build/Android/XPlatCppSdk')
  ```
  - Add dependency in to the app's **build.gradle**.
  ```
  dependencies {
    ...
    implementation project(':xplatcppsdk')
  }
  ```
2. To build an AAR file for importing to your project.
  - Open **build.gradle** in build/app/XPlatCppSdk. And remove **implementation project(':xplatcppsdk')**
  ```
  dependencies {
    ...
    implementation project(':xplatcppsdk')
  }
  ```
