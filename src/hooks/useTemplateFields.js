import { useState, useCallback } from 'react'

/**
 * Hook to manage form field values for a template
 */
export function useTemplateFields(defaultValues = {}) {
    const [values, setValues] = useState(defaultValues)

    const setValue = useCallback((fieldId, value) => {
        setValues(prev => ({ ...prev, [fieldId]: value }))
    }, [])

    const resetValues = useCallback((newDefaults = defaultValues) => {
        setValues(newDefaults)
    }, [defaultValues])

    const getValue = useCallback((fieldId) => {
        return values[fieldId]
    }, [values])

    return {
        values,
        setValue,
        getValue,
        resetValues,
        setValues,
    }
}
