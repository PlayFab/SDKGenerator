using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public interface IPlayFabHttp
    {
        Task<object> DoPost(string urlPath, object request, string authType, string authKey);
    }
}
