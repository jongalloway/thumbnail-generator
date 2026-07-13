import { describe, it, expect } from 'vitest'
import { replaceTokens, wrapTopicText } from './svgTemplateProcessor'

describe('replaceTokens', () => {
    it('replaces __TOKEN__ and {{TOKEN}} formats', () => {
        const svg = '<text>__TITLE__</text><text>{{TITLE}}</text>'
        expect(replaceTokens(svg, { TITLE: 'Hello' })).toBe('<text>Hello</text><text>Hello</text>')
    })

    it('replaces missing values with an empty string', () => {
        expect(replaceTokens('<x>__A__</x>', { A: undefined })).toBe('<x></x>')
    })
})

describe('wrapTopicText', () => {
    it('always returns exactly maxLines entries (padded)', () => {
        const lines = wrapTopicText('short topic', 25, 3)
        expect(lines).toHaveLength(3)
        expect(lines[0]).toBe('short topic')
    })

    it('returns padded empties for empty input', () => {
        expect(wrapTopicText('', 25, 3)).toEqual(['', '', ''])
    })
})
