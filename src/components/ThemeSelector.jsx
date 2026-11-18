import { useEffect, useState } from 'react'
import { usePersistedState } from '../hooks/usePersistedState'

const THEME_OPTIONS = [
    {
        value: 'system',
        label: 'System Theme',
        icon: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
    },
    {
        value: 'light',
        label: 'Light',
        icon: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    },
    {
        value: 'dark',
        label: 'Dark',
        icon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
    },
]

export function ThemeSelector() {
    const [theme, setTheme] = usePersistedState('theme', 'system')
    const [mediaQuery] = useState(() => window.matchMedia('(prefers-color-scheme: dark)'))
    const [systemIsDark, setSystemIsDark] = useState(mediaQuery.matches)
    const isDark = theme === 'dark' || (theme !== 'light' && systemIsDark)

    useEffect(() => {
        const handleChange = (event) => setSystemIsDark(event.matches)
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [mediaQuery])

    useEffect(() => {
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    }, [isDark])

    return (
        <fieldset className="theme-selector">
            <legend className="visually-hidden">Theme</legend>
            {THEME_OPTIONS.map((option) => (
                <label key={option.value} className="theme-option" title={option.label}>
                    <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={theme === option.value}
                        onChange={(event) => setTheme(event.target.value)}
                        className="visually-hidden"
                    />
                    <svg
                        width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="1.75"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                    >
                        {option.icon}
                    </svg>
                    <span className="visually-hidden">{option.label}</span>
                </label>
            ))}
        </fieldset>
    )
}
