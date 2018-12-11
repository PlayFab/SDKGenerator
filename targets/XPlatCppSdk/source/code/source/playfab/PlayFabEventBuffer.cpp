#include <stdafx.h>

#include <playfab/PlayFabEventBuffer.h>

namespace PlayFab
{
    const size_t minimalBufferSize = 4096; // The default minimal buffer size in bytes. For performance optimization reasons this ideally should be equal to the memory page size which is 4096 on most popular platforms.

    // Finds and returns a minimal power of 2 that covers the specified bufferSize.
    // For example, if bufferSize is 4000 then it will return 4096.
    static size_t AdjustBufferSize(const size_t bufferSize)
    {
        // Calculate nearest page size
        size_t result = minimalBufferSize;
        while (result < bufferSize)
        {
            result *= 2;
        }

        return  result;
    }

    PlayFabEventBuffer::PlayFabEventBuffer(
        const size_t bufferSize) 
        : 
        buffMask(AdjustBufferSize(bufferSize) - 1),
        bufferArray(std::unique_ptr<uint8_t[]>(new uint8_t[buffMask + 1])),
        buffStart((uint64_t)(bufferArray.get())),
        buffEnd(buffStart + buffMask + 1),
        eventIndex(std::shared_ptr<std::atomic<uint64_t>>(new std::atomic<uint64_t>(0))),
        disabled(false)
    {
        uint8_t *buffer = (uint8_t*)buffStart;
        memset(buffer, 0, buffMask + 1);

        // First event is just a stub which is used only to maintain the initial consistency of m_head/m_tail.
        // It is immediately considered already consumed.
        auto index = eventIndex->load(std::memory_order_relaxed);
        PlayFabEventPacket* firstEvent = CreateEventPacket(buffer, index, nullptr);

        tail = firstEvent;
        head.store(firstEvent, std::memory_order_release);
    }

    PlayFabEventBuffer::~PlayFabEventBuffer()
    {
        SpinLock lock(atomicSpin);

        // delete all remaining events (including the last consumed one)
        PlayFabEventPacket* event = head.load(std::memory_order_acquire);
        PlayFabEventPacket* nextPacket;
        while (event != nullptr)
        {
            nextPacket = event->next.load(std::memory_order_acquire);
            DeleteEventPacket(event);
            event = nextPacket;
        }
    }

    PlayFabEventBuffer::EventProducingResult PlayFabEventBuffer::TryPut(std::shared_ptr<const IPlayFabEmitEventRequest> request) // This must be thread-safe
    {
        SpinLock lock(atomicSpin);

        if (disabled.load(std::memory_order_consume))
        {
            return EventProducingResult::Disabled;
        }

        const uint32_t size = sizeof(PlayFabEventPacket);

        PlayFabEventPacket* headPtr = head.load(std::memory_order_acquire);
        PlayFabEventPacket* tailPtr = tail;

        // verify if there is enough space
        const uint64_t headVal = reinterpret_cast<uint64_t>(headPtr);
        uint64_t eventStart = reinterpret_cast<uint64_t>((uint8_t*)tailPtr + size);

        // align event start by platform-safe boundary
        if (eventStart % 8 != 0)
        {
            eventStart += 8 - (eventStart % 8);
        }

        const bool wrapping = eventStart + size > buffEnd;
        const uint64_t sizeNeeded = !wrapping ? size : size + (buffEnd - eventStart);
        const uint64_t sizeLeft = (headVal - eventStart) & buffMask;

        if (sizeNeeded > sizeLeft)
        {
            return EventProducingResult::Overflow;
        }

        if (wrapping)
        {
            eventStart = buffStart;
        }

        // create an event packet, set it to the tail->next and move the tail

        const auto currentEventIndex = eventIndex->fetch_add(1, std::memory_order_relaxed);
        PlayFabEventPacket* event = CreateEventPacket(reinterpret_cast<uint8_t*>(eventStart), currentEventIndex, std::move(request));
        tailPtr->next.store(event, std::memory_order_release);
        tail = event;

        return EventProducingResult::Success;
    }

    PlayFabEventBuffer::EventConsumingResult PlayFabEventBuffer::TryTake(std::shared_ptr<const IPlayFabEmitEventRequest>& request)
    {
        if (disabled.load(std::memory_order_consume))
        {
            return EventConsumingResult::Disabled;
        }

        PlayFabEventPacket* headPtr = head.load(std::memory_order_acquire);
        PlayFabEventPacket* event = headPtr->next.load(std::memory_order_acquire);

        if (event == nullptr)
        {
            // there are no events available for consumption
            return EventConsumingResult::Empty;
        }

        // event is available; return its values
        request = std::move(event->eventRequest);
        
        // set new head (new last consumed event)
        head.store(event, std::memory_order_release);

        // delete old last consumed event from buffer
        DeleteEventPacket(headPtr);

        return EventConsumingResult::Success;
    }

    PlayFabEventPacket* PlayFabEventBuffer::CreateEventPacket(uint8_t *location, const uint64_t index, std::shared_ptr<const IPlayFabEmitEventRequest> request)
    {
        // Use placement new to allocate an event packet in the buffer
        return new(location)PlayFabEventPacket(index, std::move(request));
    }

    void PlayFabEventBuffer::DeleteEventPacket(PlayFabEventPacket* event)
    {
        // Destroy the event packet object explicitly
        event->~PlayFabEventPacket();
    }
}
