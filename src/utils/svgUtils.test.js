// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { escapeXml, escapeXmlPreservingSpaces, flattenNestedSvgImages, inlineSvgImages, parseResolution, wrapText, wrapTextToWidth } from './svgUtils'

afterEach(() => {
    vi.restoreAllMocks()
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

describe('escapeXmlPreservingSpaces', () => {
    it('keeps repeated spaces visible in SVG text', () => {
        expect(escapeXmlPreservingSpaces('one   two & three')).toBe('one\u00a0\u00a0\u00a0two &amp; three')
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

    it('counts repeated spaces when wrapping by character limit', () => {
        expect(wrapText('This is an            exciting post', 23))
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

    it('uses repeated spaces when deciding where to wrap', () => {
        const ctx = { measureText: (text) => ({ width: text.length }) }

        expect(wrapTextToWidth('This is an            exciting post', 23, ctx, '16px sans-serif'))
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

describe('flattenNestedSvgImages', () => {
    it('merges base64 and URL-encoded SVG images into the outer document', () => {
        const result = flattenNestedSvgImages(`
            <svg xmlns="http://www.w3.org/2000/svg">
                <image href="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAgMTAiPjxjaXJjbGUgY3g9IjUiIGN5PSI1IiByPSI1Ii8+PC9zdmc+" x="10" y="20" width="100" height="80" clip-path="url(#logo-clip)" />
                <image href="data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2020%2020%22%3E%3Crect%20width%3D%2220%22%20height%3D%2220%22/%3E%3C/svg%3E" x="30" y="40" width="50" height="40" />
            </svg>
        `)

        const parsed = new DOMParser().parseFromString(result, 'image/svg+xml')
        const nestedSvgs = [...parsed.querySelectorAll('svg > svg')]
        expect(parsed.querySelectorAll('image')).toHaveLength(0)
        expect(nestedSvgs).toHaveLength(2)
        expect(nestedSvgs[0].getAttribute('viewBox')).toBe('0 0 10 10')
        expect(nestedSvgs[0].getAttribute('x')).toBe('10')
        expect(nestedSvgs[0].hasAttribute('clip-path')).toBe(false)
        expect(nestedSvgs[1].getAttribute('width')).toBe('50')
    })
})
