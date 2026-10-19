// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AzureDevelopersOnDemandTemplate } from './AzureDevelopersOnDemandTemplate'

describe('AzureDevelopersOnDemandTemplate', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders a single circular speaker photo over the selected background', () => {
        const { result } = renderHook(() => AzureDevelopersOnDemandTemplate({
            values: {
                topic: 'SRE Agent Canvas',
                speakerName: 'Paul Yuknewicz',
                speakerPhoto: { dataUrl: 'data:image/jpeg;base64,photo' },
            },
            selectedBackground: { url: '/on-demand-background.jpg' },
            resolution: '1920x1080',
        }))

        const document = new DOMParser().parseFromString(result.current.generateSvg(), 'image/svg+xml')
        const background = document.querySelector('image[href="/on-demand-background.jpg"]')
        const photo = document.querySelector('image[href="data:image/jpeg;base64,photo"]')

        expect(background).not.toBeNull()
        expect(photo?.getAttribute('clip-path')).toBe('url(#speaker-photo-clip)')
        expect(document.querySelector('svg > circle')?.getAttribute('fill')).toBe('#352b46')
        const photoClip = document.querySelector('#speaker-photo-clip circle')
        expect(photoClip).not.toBeNull()
        expect(photoClip?.getAttribute('cx')).toBe('1586')
        expect(photoClip?.getAttribute('cy')).toBe('760')
        expect(photoClip?.getAttribute('r')).toBe('500')
        expect([...document.querySelectorAll('text')].map(text => text.textContent).join(' ')).toContain('SRE Agent Canvas')
        expect(document.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 1920 1080')
    })

    it.each([undefined, null, { dataUrl: '' }])('leaves the background unobstructed without a speaker photo (%j)', speakerPhoto => {
        const { result } = renderHook(() => AzureDevelopersOnDemandTemplate({
            values: { topic: 'SRE Agent Canvas', speakerPhoto },
            selectedBackground: { url: '/on-demand-background.jpg' },
            resolution: '1920x1080',
        }))

        const document = new DOMParser().parseFromString(result.current.generateSvg(), 'image/svg+xml')

        expect(document.querySelector('svg > circle')).toBeNull()
        expect(document.querySelectorAll('image')).toHaveLength(1)
        expect(document.querySelector('image')?.getAttribute('href')).toBe('/on-demand-background.jpg')
        expect(document.querySelector('[aria-label="Microsoft logo"]')).toBeNull()
        expect([...document.querySelectorAll('text')].map(text => text.textContent).join(' ')).toContain('SRE Agent Canvas')
    })

    it.each([10, 120, null])('escapes user-provided text and respects a different export resolution (character width: %j)', characterWidth => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            characterWidth === null ? null : {
                measureText: text => ({ width: text.length * characterWidth }),
            }
        )
        const topic = '<b>&</b>'
        const { result } = renderHook(() => AzureDevelopersOnDemandTemplate({
            values: {
                topic,
                speakerName: 'Jon & <team>',
            },
            selectedBackground: { url: '/on-demand-background.jpg' },
            resolution: '1200x630',
        }))

        const svg = result.current.generateSvg()
        const document = new DOMParser().parseFromString(svg, 'image/svg+xml')

        expect(document.querySelector('parsererror')).toBeNull()
        expect(document.querySelector('svg')?.getAttribute('width')).toBe('1200')
        expect(document.querySelector('svg')?.getAttribute('height')).toBe('630')
        expect(document.querySelector('svg')?.getAttribute('preserveAspectRatio')).toBe('none')
        const textElements = [...document.querySelectorAll('text')]
        const titleElements = textElements.slice(0, -1)
        expect(titleElements).toHaveLength(characterWidth === 120 ? 2 : 1)
        expect(titleElements.map(text => text.textContent).join('')).toBe(topic)
        expect(textElements.at(-1)?.textContent).toBe('with Jon & <team>')
        expect(document.querySelector('b, team')).toBeNull()
    })
})
