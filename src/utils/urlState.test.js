import { describe, expect, it } from 'vitest'
import { parseUrlState, buildShareParams, buildShareUrl } from './urlState'

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

    it('resolves preset logo ids against the provided logo catalog', () => {
        const availableLogos = [
            { id: 'dotnet', name: '.NET', file: 'dotnet.svg', url: '/logos/dotnet.svg' },
            { id: 'github', name: 'GitHub', file: 'github.svg', url: '/logos/github.svg' },
        ]

        const state = parseUrlState('?template=dotnet-blog&logos=dotnet,github,unknown', availableLogos)

        expect(state.fieldValues.logos).toEqual([
            { id: 'dotnet', name: '.NET', file: 'dotnet.svg', url: '/logos/dotnet.svg' },
            { id: 'github', name: 'GitHub', file: 'github.svg', url: '/logos/github.svg' },
        ])
    })
})

describe('buildShareParams', () => {
    it('serializes template, background, resolution, format, and text fields', () => {
        const params = buildShareParams({
            templateId: 'on-dotnet-live',
            backgroundId: 'my-background',
            resolution: '1920x1080',
            exportFormat: 'png',
            fieldValues: { title: 'Building with .NET', guestCount: '2', day: 'Tuesday' },
        })

        expect(params.get('template')).toBe('on-dotnet-live')
        expect(params.get('background')).toBe('my-background')
        expect(params.get('resolution')).toBe('1920x1080')
        expect(params.get('format')).toBe('png')
        expect(params.get('title')).toBe('Building with .NET')
        expect(params.get('guestCount')).toBe('2')
        expect(params.get('day')).toBe('Tuesday')
    })

    it('skips image-based fields and empty values', () => {
        const params = buildShareParams({
            templateId: 'on-dotnet-live',
            fieldValues: { title: '', guests: [{ name: 'x' }] },
        })

        expect(params.has('title')).toBe(false)
        expect(params.has('guests')).toBe(false)
    })

    it('serializes preset logos as ids but omits uploaded ones', () => {
        const params = buildShareParams({
            templateId: 'dotnet-blog',
            fieldValues: {
                logos: [
                    { id: 'dotnet', name: '.NET', url: '/logos/dotnet.svg' },
                    { id: 'uploaded-123', name: 'custom.png', dataUrl: 'data:...', isUploaded: true },
                ],
            },
        })

        expect(params.get('logos')).toBe('dotnet')
    })

    it('round-trips selected logos through parseUrlState', () => {
        const availableLogos = [
            { id: 'dotnet', name: '.NET', file: 'dotnet.svg', url: '/logos/dotnet.svg' },
        ]

        const shareUrl = buildShareUrl({
            templateId: 'dotnet-blog',
            fieldValues: { title: 'Hello', logos: availableLogos },
        }, 'https://example.com/')

        const url = new URL(shareUrl)
        const state = parseUrlState(url.search, availableLogos)

        expect(state.fieldValues.logos).toEqual(availableLogos)
    })

    it('round-trips through parseUrlState', () => {
        const shareUrl = buildShareUrl({
            templateId: 'on-dotnet-live',
            resolution: '1280x720',
            exportFormat: 'webp',
            fieldValues: { title: 'Round trip', guestCount: '2', day: 'Friday' },
        }, 'https://example.com/')

        const url = new URL(shareUrl)
        const state = parseUrlState(url.search)

        expect(state.templateId).toBe('on-dotnet-live')
        expect(state.resolution).toBe('1280x720')
        expect(state.exportFormat).toBe('webp')
        expect(state.fieldValues).toMatchObject({
            title: 'Round trip',
            guestCount: '2',
            day: 'Friday',
        })
    })
})
