# XPlatCppSdk for Android

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
