// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { escapeXml, inlineSvgImages, parseResolution, wrapText, wrapTextToWidth } from './svgUtils'

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('escapeXml', () => {
    it('escapes XML special characters', () => {
        expect(escapeXml('Tom & Jerry <"\'>')).toBe('Tom &amp; Jerry &lt;&quot;&apos;&gt;')
    })

    it('returns an empty string for falsy input', () => {
        expect(escapeXml('')).toBe('')
        expect(escapeXml(undefined)).toBe('')
    })
})

describe('wrapText', () => {
    it('wraps words within the character limit', () => {
        expect(wrapText('one two three four', 8)).toEqual(['one two', 'three', 'four'])
    })

    it('returns an empty array for empty input', () => {
        expect(wrapText('', 10)).toEqual([])
    })

    it('preserves explicit line breaks', () => {
        expect(wrapText('first line\nsecond line', 20)).toEqual(['first line', 'second line'])
    })

    it('uses repeated spaces as an explicit wrapping point', () => {
        expect(wrapText('This is an  exciting post', 100))
            .toEqual(['This is an', 'exciting post'])
    })
})

describe('parseResolution', () => {
    it('parses a valid WxH string', () => {
        expect(parseResolution('1280x720')).toEqual([1280, 720])
    })

    it('falls back to 1920x1080 for invalid input', () => {
        expect(parseResolution('garbage')).toEqual([1920, 1080])
        expect(parseResolution(undefined)).toEqual([1920, 1080])
    })
})

describe('wrapTextToWidth', () => {
    it('preserves explicit line breaks while wrapping each line', () => {
        const ctx = { measureText: (text) => ({ width: text.length }) }

        expect(wrapTextToWidth('first line\nsecond line', 20, ctx, '16px sans-serif'))
            .toEqual(['first line', 'second line'])
    })

    it('uses repeated spaces as an explicit wrapping point', () => {
        const ctx = { measureText: (text) => ({ width: text.length }) }

        expect(wrapTextToWidth('This is an  exciting post', 100, ctx, '16px sans-serif'))
            .toEqual(['This is an', 'exciting post'])
    })
})

describe('inlineSvgImages', () => {
    it('embeds external image assets as data URLs', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            blob: vi.fn().mockResolvedValue(new File(['image data'], 'logo.png', { type: 'image/png' })),
        }))

        const result = await inlineSvgImages(`
            <svg xmlns="http://www.w3.org/2000/svg">
                <image href="/images/logo.png" />
            </svg>
        `)

        const doc = new DOMParser().parseFromString(result, 'image/svg+xml')
        const image = doc.querySelector('image')

        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:3000/images/logo.png',
            expect.objectContaining({ mode: 'cors' })
        )
        expect(image?.getAttribute('href')).toMatch(/^data:image\/png;base64,/)
        expect(image?.getAttribute('xlink:href')).toMatch(/^data:image\/png;base64,/)
    })
    it('embeds SVG image assets as data URLs without nesting SVG documents', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            blob: vi.fn().mockResolvedValue(new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg', { type: 'image/svg+xml' })),
        }))

        const result = await inlineSvgImages(`
            <svg xmlns="http://www.w3.org/2000/svg">
                <image href="/images/logo.svg" x="10" y="20" width="32" height="32" />
            </svg>
        `)

        const document = new DOMParser().parseFromString(result, 'image/svg+xml')
        const image = document.querySelector('image')
        expect(image?.getAttribute('x')).toBe('10')
        expect(image?.getAttribute('y')).toBe('20')
        expect(image?.getAttribute('href')).toMatch(/^data:image\/svg\+xml;base64,/)
        expect(image?.getAttribute('xlink:href')).toMatch(/^data:image\/svg\+xml;base64,/)
    })
})
