// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeSelector } from './ThemeSelector'
import { loadPersistedSettings, persistSetting } from '../hooks/usePersistedState'

describe('ThemeSelector', () => {
    let mediaQuery

    beforeEach(() => {
        const storage = new Map()
        vi.stubGlobal('localStorage', {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)),
        })
        mediaQuery = {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }
        vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    })

    afterEach(() => {
        cleanup()
        delete document.documentElement.dataset.theme
        vi.unstubAllGlobals()
    })

    it.each([
        { systemIsDark: false, savedTheme: undefined, expectedTheme: 'light' },
        { systemIsDark: true, savedTheme: undefined, expectedTheme: 'dark' },
        { systemIsDark: true, savedTheme: 'light', expectedTheme: 'light' },
        { systemIsDark: false, savedTheme: 'dark', expectedTheme: 'dark' },
    ])('uses $expectedTheme with system dark=$systemIsDark and saved=$savedTheme', ({
        systemIsDark, savedTheme, expectedTheme,
    }) => {
        mediaQuery.matches = systemIsDark
        if (savedTheme) persistSetting('theme', savedTheme)

        render(<ThemeSelector />)

        expect(document.documentElement).toHaveAttribute('data-theme', expectedTheme)
        expect(screen.getByRole('group', { name: 'Theme' })).toHaveFormValues({ theme: savedTheme ?? 'system' })
    })

    it('remembers a manual choice across remounts without replacing other settings', () => {
        persistSetting('resolution', '1200x630')
        const view = render(<ThemeSelector />)

        fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))

        expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
        expect(loadPersistedSettings()).toMatchObject({ theme: 'dark', resolution: '1200x630' })

        view.unmount()
        render(<ThemeSelector />)

        expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()

        fireEvent.click(screen.getByRole('radio', { name: 'Light' }))

        expect(document.documentElement).toHaveAttribute('data-theme', 'light')
        expect(loadPersistedSettings().theme).toBe('light')
    })

    it('resumes following system changes when System Theme is selected and cleans up on unmount', () => {
        const view = render(<ThemeSelector />)
        const handleChange = mediaQuery.addEventListener.mock.calls[0][1]
        expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', handleChange)

        act(() => handleChange({ matches: true }))
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

        fireEvent.click(screen.getByRole('radio', { name: 'Light' }))
        act(() => handleChange({ matches: false }))
        act(() => handleChange({ matches: true }))
        expect(document.documentElement).toHaveAttribute('data-theme', 'light')

        fireEvent.click(screen.getByRole('radio', { name: 'System Theme' }))
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
        expect(loadPersistedSettings().theme).toBe('system')

        act(() => handleChange({ matches: false }))
        expect(document.documentElement).toHaveAttribute('data-theme', 'light')

        view.unmount()
        expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', handleChange)
    })
})
