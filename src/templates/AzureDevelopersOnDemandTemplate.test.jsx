// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AzureDevelopersOnDemandTemplate } from './AzureDevelopersOnDemandTemplate'

describe('AzureDevelopersOnDemandTemplate', () => {
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
        expect(photoClip?.getAttribute('cx')).toBe('1545')
        expect(photoClip?.getAttribute('cy')).toBe('760')
        expect(photoClip?.getAttribute('r')).toBe('455')
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

    it('escapes user-provided text and respects a different export resolution', () => {
        const { result } = renderHook(() => AzureDevelopersOnDemandTemplate({
            values: {
                topic: '<b>New & useful</b>',
                speakerName: 'Jon',
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
        expect([...document.querySelectorAll('text')].map(text => text.textContent).join(' ')).toContain('<b>New & useful</b>')
    })
})
