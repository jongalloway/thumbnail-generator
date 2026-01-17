/**
 * Custom hook for persisting state to localStorage
 * 
 * Provides automatic saving and loading of state values,
 * with fallback to default values when localStorage is unavailable
 * or when the stored value is invalid.
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'thumbnail-generator-settings'

/**
 * Load all persisted settings from localStorage
 * @returns {Object} The persisted settings object, or empty object if none
 */
export function loadPersistedSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        console.warn('Failed to load persisted settings:', error)
    }
    return {}
}

/**
 * Save a single setting to localStorage
 * @param {string} key - The setting key
 * @param {*} value - The value to persist
 */
export function persistSetting(key, value) {
    try {
        const current = loadPersistedSettings()
        current[key] = value
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    } catch (error) {
        console.warn('Failed to persist setting:', error)
    }
}

/**
 * Hook that provides a state value that persists to localStorage
 * @param {string} key - The storage key for this value
 * @param {*} defaultValue - Default value if nothing is stored
 * @returns {[*, Function]} - State value and setter function
 */
export function usePersistedState(key, defaultValue) {
    // Initialize from localStorage or use default
    const [value, setValue] = useState(() => {
        const persisted = loadPersistedSettings()
        return persisted[key] !== undefined ? persisted[key] : defaultValue
    })

    // Persist changes to localStorage
    useEffect(() => {
        persistSetting(key, value)
    }, [key, value])

    return [value, setValue]
}

/**
 * Hook specifically for persisting template and background settings
 * Returns functions to save/load the current app state
 */
export function useSettingsPersistence() {
    const saveSettings = useCallback((settings) => {
        try {
            const current = loadPersistedSettings()
            const updated = { ...current, ...settings }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
            console.warn('Failed to save settings:', error)
        }
    }, [])

    const loadSettings = useCallback(() => {
        return loadPersistedSettings()
    }, [])

    const clearSettings = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch (error) {
            console.warn('Failed to clear settings:', error)
        }
    }, [])

    return { saveSettings, loadSettings, clearSettings }
}

export default usePersistedState
