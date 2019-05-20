using System;

namespace PlayFab.Internal
{
    [Obsolete("This interface is deprecated, please use PlayFab.ITransportPlugin instead.", false)]
    public interface IPlayFabHttp: ITransportPlugin
    {
    }
}