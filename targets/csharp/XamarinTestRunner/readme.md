Prerequisites:

- Read: [System requirements](https://docs.microsoft.com/xamarin/cross-platform/get-started/requirements)
- Follow: [Installing Xamarin](https://docs.microsoft.com/xamarin/cross-platform/get-started/installation/index) (add checkbox "Universal Windows Platform tools for Xamarin")
- Follow: [Installing Xamarin.iOS on Windows](https://docs.microsoft.com/xamarin/ios/get-started/installation/windows/index)

Assign the environment variables `Remote-Build_Mac_ip` and `Remote-Build_Mac_username` which the build script uses to know where to connect over SSH to build the iOS IPA file.

Copy your `testTitle.json` file into `XamarinTestRunner\XamarinTestRunner` (next to `XamarinTestRunner.csproj` and `App.xaml`).
