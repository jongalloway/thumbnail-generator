import { describe, it, expect } from 'vitest'
import { escapeXml, wrapText, parseResolution } from './svgUtils'

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
