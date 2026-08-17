import { describe, expect, it } from 'vitest'
import { wrapSpeakerNames } from './speakerNameLines'

describe('wrapSpeakerNames', () => {
    it('keeps a second speaker full name together after the plus separator', () => {
        const context = {
            font: '',
            measureText: text => ({ width: text.length }),
        }

        expect(wrapSpeakerNames(['Abraham Lincoln', 'Fredo Corleone'], 30, context, '700 56px Segoe UI')).toEqual([
            'with Abraham Lincoln +',
            'Fredo Corleone',
        ])
    })
})