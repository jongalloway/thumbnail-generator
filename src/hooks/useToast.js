import { useState, useCallback } from 'react'

/**
 * Hook for showing toast notifications
 */
export function useToast(duration = 3000) {
    const [toast, setToast] = useState(null)

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), duration)
    }, [duration])

    const hideToast = useCallback(() => {
        setToast(null)
    }, [])

    return {
        toast,
        showToast,
        hideToast,
    }
}
