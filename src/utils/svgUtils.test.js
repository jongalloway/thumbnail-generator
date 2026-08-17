// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { escapeXml, inlineSvgImages, parseResolution, wrapText } from './svgUtils'

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
    it('inlines SVG image assets with namespaced references', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            blob: vi.fn().mockResolvedValue({
                type: 'image/svg+xml',
                text: vi.fn().mockResolvedValue(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                        <defs><linearGradient id="gradient"><stop /></linearGradient></defs>
                        <style>
                            #shape { fill: url("#gradient"); }
                        </style>
                        <rect id="shape" fill="url('#gradient')" />
                        <circle fill="url(#gradient)" />
                    </svg>
                `),
            }),
        }))

        const result = await inlineSvgImages(`
            <svg xmlns="http://www.w3.org/2000/svg">
                <image href="/images/logo.svg" x="10" y="20" width="32" height="32" />
            </svg>
        `)

        const document = new DOMParser().parseFromString(result, 'image/svg+xml')
        const embeddedSvg = document.querySelector('svg > svg')
        expect(document.querySelector('image')).toBeNull()
        expect(embeddedSvg?.getAttribute('x')).toBe('10')
        expect(embeddedSvg?.getAttribute('y')).toBe('20')
        expect(embeddedSvg?.querySelector('linearGradient')?.getAttribute('id')).toBe('embedded-svg-0-gradient')
        expect(embeddedSvg?.querySelector('rect')?.getAttribute('fill')).toBe("url('#embedded-svg-0-gradient')")
        expect(embeddedSvg?.querySelector('circle')?.getAttribute('fill')).toBe('url(#embedded-svg-0-gradient)')
        expect(embeddedSvg?.querySelector('style')?.textContent).toContain('#embedded-svg-0-shape')
        expect(embeddedSvg?.querySelector('style')?.textContent).toContain('url("#embedded-svg-0-gradient")')
    })
})
