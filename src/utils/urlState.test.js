import { describe, expect, it } from 'vitest'
import { parseUrlState } from './urlState'

describe('parseUrlState', () => {
    it('parses template selection and field values', () => {
        const state = parseUrlState(
            '?template=on-dotnet-live&title=Building%20with%20.NET&guestCount=2&day=Tuesday'
        )

        expect(state.templateId).toBe('on-dotnet-live')
        expect(state.fieldValues).toMatchObject({
            title: 'Building with .NET',
            guestCount: '2',
            day: 'Tuesday',
        })
        expect(state.providedFields).toEqual(['title', 'guestCount', 'day'])
    })

    it('ignores invalid selections and upload-only fields', () => {
        const state = parseUrlState('?template=on-dotnet-live&guestCount=3&guests=ignored')

        expect(state.fieldValues.guestCount).toBe('1')
        expect(state.fieldValues.guests).toEqual([])
    })
})
