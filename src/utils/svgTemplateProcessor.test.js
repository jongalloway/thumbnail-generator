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

    it('handles repeated words in long topics correctly', () => {
        // "the" appears multiple times; indexOf would incorrectly slice from the first occurrence
        const lines = wrapTopicText('the quick brown fox the the lazy dog the end', 20, 3)
        expect(lines).toHaveLength(3)
        // The last line should contain everything from the overflow point onward,
        // not re-include words from the beginning
        const joined = lines.join(' ').trimEnd()
        expect(joined).toBe('the quick brown fox the the lazy dog the end')
    })

    it('counts repeated spaces when deciding where the topic wraps', () => {
        expect(wrapTopicText('This is an            exciting post', 23, 3))
            .toEqual(['This is an', 'exciting post', ''])
    })

    it('does not exceed maxLines when the limit is one line', () => {
        expect(wrapTopicText('a b', 1, 1)).toEqual(['a b'])
    })

    it('treats an explicit newline as a forced line break', () => {
        expect(wrapTopicText('Performance improvements\nin C# Dev Kit 11.0', 40, 3))
            .toEqual(['Performance improvements', 'in C# Dev Kit 11.0', ''])
    })

    it('supports multiple forced line breaks that each fit on one line', () => {
        expect(wrapTopicText('Performance\nimprovements in\nC# Dev Kit 11.0', 40, 3))
            .toEqual(['Performance', 'improvements in', 'C# Dev Kit 11.0'])
    })

    it('still auto-wraps a paragraph that is too long after a forced line break', () => {
        expect(wrapTopicText('Short\nA longer second paragraph that needs wrapping', 20, 3))
            .toEqual(['Short', 'A longer second', 'paragraph that needs wrapping'])
    })

    it('stops once maxLines is reached across forced line breaks', () => {
        expect(wrapTopicText('One\nTwo\nThree\nFour', 20, 3))
            .toEqual(['One', 'Two', 'Three'])
    })
})
