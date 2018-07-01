namespace PlayFab.SharedModels
{
    public class HttpResponseObject
    {
        public int code;
        public string status;
        public object data;
    }

    public class PlayFabRequestCommon
    {
    }

    public class PlayFabResultCommon
    {
        public PlayFabRequestCommon Request;
        public object CustomData;
    }

    public class WaitForPlayFabResponse<T> : UnityEngine.CustomYieldInstruction where T:PlayFabResultCommon
    {
        public T Result;
        public PlayFabError Error;

        bool complete = false;

        public override bool keepWaiting { get { return !complete; } }
        public bool IsError { get { return Error != null; } }

        public void Complete(T r) {
            Result = r;
            Error = null;
            complete = true;
        }

        public void Complete(PlayFabError e) {
            Result = null;
            Error = e;
            complete = true;
        }
    }
}
