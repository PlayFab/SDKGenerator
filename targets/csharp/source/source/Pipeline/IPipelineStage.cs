using System.Collections.Concurrent;
using System.Threading;

namespace PlayFab.Pipeline
{/*
    /// <summary>
    /// Conventional implementation of event arguments for PipelineStageNotificationEvent C# event.
    /// </summary>
    public class PipelineStageNotificationEventArgs<TInputItem, TOutputItem> : EventArgs
    {
        public TInputItem InputItem { get; private set; }
        public TOutputItem OutputItem { get; private set; }

        public PipelineStageNotificationEventArgs(TInputItem inputItem, TOutputItem outputItem)
        {
            this.InputItem = inputItem;
            this.OutputItem = outputItem;
        }
    }*/

    /// <summary>
    /// The common interface of an event pipeline stage.
    /// </summary>
    /// <typeparam name="TInputItem">The item type in the input collection.</typeparam>
    /// <typeparam name="TOutputItem">The item type in the output collection.</typeparam>
    internal interface IPipelineStage<TInputItem, TOutputItem>
    {
        /// <summary>
        /// The stage's long-running operation.
        /// </summary>
        /// <param name="input">The input collection.</param>
        /// <param name="output">The output collection.</param>
        /// <param name="cts">The cancellation token source which can be used by the operation to exit 
        /// if cancellation was requested from outside or to signal a cancellation to outside.</param>
        void RunStage(BlockingCollection<TInputItem> input, BlockingCollection<TOutputItem> output, CancellationTokenSource cts);

        /// <summary>
        /// The event to notify a user about the outcome of a batch send operation.
        /// The user can subscribe to this event.
        /// </summary>
        //event EventHandler<PipelineStageNotificationEventArgs<TInputItem, TOutputItem>> RaiseStageNotificationEvent;
    }
}
