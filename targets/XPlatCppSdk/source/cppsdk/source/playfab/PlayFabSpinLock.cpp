#include <stdafx.h>

#include <playfab/PlayFabSpinLock.h>

namespace PlayFab
{
    const std::thread::id invalidThreadId; // contains an id that does not represent a thread (from std documentation)
    const size_t spinToSwitch = 10; // number of attempts to acquire control from one thread before it yields (lets other threads run) until attempting again

    AtomicSpin::AtomicSpin()
        : threadId(invalidThreadId), count(0)
    {
    }

    AtomicSpin::~AtomicSpin()
    {
    }

    void AtomicSpin::Acquire()
    {
        const std::thread::id current_thread_id = std::this_thread::get_id();

        if (current_thread_id != threadId.load(std::memory_order_acquire))
        {
            std::thread::id expected = invalidThreadId;
            size_t spinCount = spinToSwitch;

            while (!threadId.compare_exchange_weak(expected, current_thread_id, std::memory_order_release, std::memory_order_acquire))
            {
                expected = invalidThreadId;
                --spinCount;
                if (spinCount == 0)
                {
                    std::this_thread::yield();
                    spinCount = spinToSwitch;
                }
            }
        }

        ++count;
    }

    bool AtomicSpin::TryAcquire()
    {
        const std::thread::id current_thread_id = std::this_thread::get_id();
        bool result = true;

        if (current_thread_id != threadId.load(std::memory_order_acquire))
        {
            std::thread::id expected = invalidThreadId;
            result = threadId.compare_exchange_strong(expected, current_thread_id, std::memory_order_release, std::memory_order_acquire);
        }

        if (result)
        {
            ++count;
        }

        return result;
    }

    void AtomicSpin::Release()
    {
        --count;

        if (count == 0)
        {
            threadId.store(invalidThreadId, std::memory_order_release);
        }
    }

    SpinLock::SpinLock(AtomicSpin& atomicSpin)
        : spin(atomicSpin)
    {
        spin.Acquire();
    }

    SpinLock::~SpinLock()
    {
        spin.Release();
    }
}
