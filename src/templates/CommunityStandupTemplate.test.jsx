// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getCommunityStandupGuestCount } from '../utils/communityStandupGuests'

const templateDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/templates/dotnet-community-standup')

function readTemplate(name) {
    return new DOMParser().parseFromString(
        readFileSync(resolve(templateDirectory, name), 'utf8'),
        'image/svg+xml',
    )
}

describe('CommunityStandupTemplate', () => {
    it('selects the one-guest layout for one uploaded photo', () => {
        expect(getCommunityStandupGuestCount([{}])).toBe(1)
        expect(getCommunityStandupGuestCount([])).toBe(2)
        expect(getCommunityStandupGuestCount([{}, {}, {}, {}, {}])).toBe(4)
    })

    it('centers a 25% larger circle between the two-guest circles', () => {
        const oneGuest = readTemplate('one-guest.svg')
        const twoGuests = readTemplate('two-guests.svg')
        const singleCircle = oneGuest.querySelector('#circle7')
        const firstCircle = twoGuests.querySelector('#circle7')
        const secondCircle = twoGuests.querySelector('#circle8')

        const midpointX = (Number(firstCircle.getAttribute('cx')) + Number(secondCircle.getAttribute('cx'))) / 2
        const midpointY = (Number(firstCircle.getAttribute('cy')) + Number(secondCircle.getAttribute('cy'))) / 2

        expect(Math.abs(Number(singleCircle.getAttribute('cx')) - midpointX)).toBeLessThan(20)
        expect(Math.abs(Number(singleCircle.getAttribute('cy')) - midpointY)).toBeLessThan(20)
        expect(Number(singleCircle.getAttribute('r'))).toBeCloseTo(Number(firstCircle.getAttribute('rx')) * 1.25)
        expect(Number(singleCircle.getAttribute('r'))).toBeCloseTo(Number(secondCircle.getAttribute('r')) * 1.25)
    })
})