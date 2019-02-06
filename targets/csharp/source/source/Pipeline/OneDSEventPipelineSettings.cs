using System;

namespace PlayFab.Pipeline
{
    public class OneDSEventPipelineSettings
    {
        // The size of the event buffer (contains event objects) by default
        public const int DefaultEventBufferSize = 100;

        // The size of the batch buffer (contains batch objects) by default
        public const int DefaultBatchBufferSize = 20;

        // The size of an event batch (i.e. maximum number of events it may reference) by default
        public const int DefaultBatchSize = 25;

        public const int DefaultMaxHttpAttempts = 3;

        // The maximum duration of time a batch can be held around before it is forced to send out
        // even if it is not full yet
        public static readonly TimeSpan DefaultBatchFillTimeout = TimeSpan.FromSeconds(5);

        private int batchSize = DefaultBatchSize;
        private TimeSpan batchFillTimeout = DefaultBatchFillTimeout;

        /// <summary>
        /// The size of the event buffer.
        /// </summary>
        public int EventBufferSize { get; set; } = DefaultEventBufferSize;

        /// <summary>
        /// The size of the batch buffer.
        /// </summary>
        public int BatchBufferSize { get; set; } = DefaultBatchBufferSize;

        /// <summary>
        /// The size of a batch.
        /// It cannot be less than 1 or greater than 25.
        /// </summary>
        public int BatchSize
        {
            get
            {
                return this.batchSize;
            }

            set
            {
                if (value < 1)
                {
                    throw new ArgumentOutOfRangeException(nameof(this.BatchSize), "The batch size setting cannot be less than 1");
                }

                if (value > 25)
                {
                    throw new ArgumentOutOfRangeException(nameof(this.BatchSize), "The batch size setting cannot be greater than 25");
                }

                this.batchSize = value;
            }
        }

        /// <summary>
        /// The maximum wait time before a batch is sent out, even if it is incomplete.
        /// Complete batches are sent out immediately.
        /// Minimum wait time is 100 ms, maximum is one hour.
        /// </summary>
        public TimeSpan BatchFillTimeout
        {
            get
            {
                return this.batchFillTimeout;
            }

            set
            {
                if (value < TimeSpan.FromMilliseconds(100))
                {
                    throw new ArgumentOutOfRangeException(nameof(this.BatchFillTimeout), "The batch fill timeout setting cannot be less than 100 ms");
                }

                if (value > TimeSpan.FromHours(1))
                {
                    throw new ArgumentOutOfRangeException(nameof(this.BatchFillTimeout), "The batch fill timeout setting cannot be greater than 1 hour");
                }

                this.batchFillTimeout = value;
            }
        }

        public int MaxHttpAttempts { get; set; } = DefaultMaxHttpAttempts;
    }
}