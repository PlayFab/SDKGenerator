// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <ppltasks.h>
#include "TestApp.h"

using namespace concurrency;
using namespace Windows::ApplicationModel;
using namespace Windows::ApplicationModel::Core;
using namespace Windows::ApplicationModel::Activation;
using namespace Windows::UI::Core;
using namespace Windows::Foundation;
using namespace DirectX;

static int testResult = 0;

ref class ViewProvider sealed : public IFrameworkView
{
    public:
        // IFrameworkView methods
        virtual void Initialize(CoreApplicationView^ applicationView)
        {
            applicationView->Activated +=
                ref new TypedEventHandler<CoreApplicationView^, IActivatedEventArgs^>(this, &ViewProvider::OnActivated);

            CoreApplication::Suspending +=
                ref new EventHandler<SuspendingEventArgs^>(this, &ViewProvider::OnSuspending);

            CoreApplication::Resuming +=
                ref new EventHandler<Platform::Object^>(this, &ViewProvider::OnResuming);

            CoreApplication::DisableKinectGpuReservation = true;

            PlayFabUnit::TestApp testApp;
            testResult = testApp.Main();
        }

        virtual void Uninitialize()
        {
        }

        virtual void SetWindow(CoreWindow^ window)
        {
            window->Closed +=
                ref new TypedEventHandler<CoreWindow^, CoreWindowEventArgs^>(this, &ViewProvider::OnWindowClosed);
        }

        virtual void Load(Platform::String^ entryPoint)
        {
        }

        virtual void Run()
        {
        }

    protected:
        // Event handlers
        void OnActivated(CoreApplicationView^ applicationView, IActivatedEventArgs^ args)
        {
            CoreWindow::GetForCurrentThread()->Activate();
        }

        void OnSuspending(Platform::Object^ sender, SuspendingEventArgs^ args)
        {
            auto deferral = args->SuspendingOperation->GetDeferral();

            create_task([this, deferral]()
            {
                deferral->Complete();
            });
        }

        void OnResuming(Platform::Object^ sender, Platform::Object^ args)
        {
        }

        void OnWindowClosed(CoreWindow^ sender, CoreWindowEventArgs^ args)
        {
        }
};

ref class ViewProviderFactory : IFrameworkViewSource
{
    public:
        virtual IFrameworkView^ CreateView()
        {
            return ref new ViewProvider();
        }
};

// Xbox One Entry Point
[Platform::MTAThread]
int __cdecl main(Platform::Array<Platform::String^>^ /*argv*/)
{
    auto viewProviderFactory = ref new ViewProviderFactory();
    CoreApplication::Run(viewProviderFactory);

    return testResult;
}