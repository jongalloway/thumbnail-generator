import { describe, it, expect } from 'vitest'
import { STANDUP_NAME_BY_BACKGROUND, formatBackgroundLabel } from './backgroundLabels'

describe('formatBackgroundLabel', () => {
    it('uses the standup-name override for known community-standup backgrounds', () => {
        expect(formatBackgroundLabel('dotnet-standup-ai')).toBe('.NET & AI')
        expect(formatBackgroundLabel('dotnet-standup-aspnet')).toBe('ASP.NET CORE')
        expect(formatBackgroundLabel('dotnet-standup-runtime')).toBe('LANGUAGES & RUNTIME')
    })

    it('matches overrides case-insensitively', () => {
        expect(formatBackgroundLabel('DOTNET-STANDUP-DATA')).toBe('.NET DATA')
    })

    it('falls back to title-casing for unknown backgrounds', () => {
        expect(formatBackgroundLabel('my-cool-background')).toBe('My Cool Background')
        expect(formatBackgroundLabel('sunset_light')).toBe('Sunset Light')
    })
})

describe('STANDUP_NAME_BY_BACKGROUND', () => {
    it('covers all five standup backgrounds', () => {
        expect(Object.keys(STANDUP_NAME_BY_BACKGROUND).sort()).toEqual([
            'dotnet-standup-ai',
            'dotnet-standup-aspnet',
            'dotnet-standup-data',
            'dotnet-standup-maui',
            'dotnet-standup-runtime',
        ])
    })

    it('uses all-uppercase names (except the .NET brand casing)', () => {
        for (const name of Object.values(STANDUP_NAME_BY_BACKGROUND)) {
            expect(name).toBe(name.toUpperCase())
        }
    })
})
