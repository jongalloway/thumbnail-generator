// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MicrosoftDeveloperBlogTemplate } from './MicrosoftDeveloperBlogTemplate'
import { DEVCOM_ART } from './devcomArt'

const BASE_VALUES = { title: 'Shipping faster with Microsoft Developer' }

function render(values = {}, overrides = {}) {
    const { result } = renderHook(() => MicrosoftDeveloperBlogTemplate({
        values: { ...BASE_VALUES, ...values },
        selectedBackground: { url: '/background.svg', variant: 'dark' },
        variant: 'dark',
        resolution: '1920x1080',
        ...overrides,
    }))
    return new DOMParser().parseFromString(result.current.generateSvg(), 'image/svg+xml')
}

function images(doc) {
    return [...doc.querySelectorAll('image')]
}

describe('MicrosoftDeveloperBlogTemplate', () => {
    it('bundles the developer.microsoft.com artwork set', () => {
        expect(Object.keys(DEVCOM_ART)).toEqual(['cubes', 'ribbon'])
    })

    it('falls back to the built-in artwork when no logos or layout image are set', () => {
        const doc = render({ art: 'cubes' })
        const artwork = images(doc).find(image => image.getAttribute('href') === DEVCOM_ART.cubes)

        expect(artwork).not.toBeUndefined()
        expect(artwork.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
    })

    it('renders the supplied ribbon as right-side artwork', () => {
        const doc = render({ art: 'ribbon' })
        const artwork = images(doc).find(image => image.getAttribute('href') === DEVCOM_ART.ribbon)

        expect(artwork).not.toBeUndefined()
        expect(artwork.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
        expect(Number(artwork.getAttribute('x'))).toBeCloseTo(1280, 1)
        expect(Number(artwork.getAttribute('y'))).toBe(0)
        expect(Number(artwork.getAttribute('width'))).toBeCloseTo(640, 1)
        expect(Number(artwork.getAttribute('height'))).toBe(1080)
        expect(artwork.getAttribute('mask')).toBeNull()
        expect(doc.querySelector('[id$="-ribbon-mask"]')).toBeNull()
    })

    it('keeps the artwork inside the right third so the text column stays clear', () => {
        const doc = render({ art: 'cubes' })
        const artwork = images(doc).find(image => image.getAttribute('href') === DEVCOM_ART.cubes)

        // 1920 * 0.635 === 1219.2
        expect(Number(artwork.getAttribute('x'))).toBeCloseTo(1219.2, 1)
        expect(Number(artwork.getAttribute('x'))).toBeGreaterThan(1920 * 0.6)
    })

    it('omits the artwork when a layout image is supplied', () => {
        const doc = render({
            art: 'cubes',
            imageLayout: 'artwork',
            layoutImage: { dataUrl: 'data:image/png;base64,uploaded' },
        })
        const hrefs = images(doc).map(image => image.getAttribute('href'))

        expect(hrefs).toContain('data:image/png;base64,uploaded')
        expect(hrefs).not.toContain(DEVCOM_ART.cubes)
    })

    it('uses the .NET Blog geometry for an uploaded rectangular image', () => {
        const doc = render({
            art: 'cubes',
            imageLayout: 'overlay',
            layoutImage: { dataUrl: 'data:image/jpeg;base64,uploaded' },
        })
        const uploaded = images(doc)
            .find(image => image.getAttribute('href') === 'data:image/jpeg;base64,uploaded')

        expect(Number(uploaded?.getAttribute('x'))).toBe(1239)
        expect(Number(uploaded?.getAttribute('y'))).toBe(110)
        expect(Number(uploaded?.getAttribute('width'))).toBe(950)
        expect(Number(uploaded?.getAttribute('height'))).toBe(861)
        expect(uploaded?.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
    })

    it('omits the artwork when logos are selected', () => {
        const doc = render({ art: 'cubes', logos: [{ url: '/logos/dotnet.svg' }] })
        const hrefs = images(doc).map(image => image.getAttribute('href'))

        expect(hrefs).toContain('/logos/dotnet.svg')
        expect(hrefs).not.toContain(DEVCOM_ART.cubes)
    })

    it('renders no artwork when art is set to none', () => {
        const doc = render({ art: 'none' })
        const hrefs = images(doc).map(image => image.getAttribute('href'))

        expect(hrefs).toEqual(['/background.svg'])
    })

    it('keeps text inside the left column when bundled artwork is disabled', () => {
        const doc = render({
            art: 'none',
            title: 'Meet the people building the developer platform',
            subtitle: 'New tooling, new docs, and a faster path from idea to production',
        }, {
            selectedBackground: {
                id: 'msdev_light_full-bleed_cubes',
                url: '/background.jpg',
                variant: 'light',
            },
            variant: 'light',
        })
        const textClip = doc.querySelector('[id$="-text-clip"]')
        const clipRect = textClip?.querySelector('rect')
        const title = [...doc.querySelectorAll('text')]
            .find(element => element.textContent.includes('Meet the people'))

        expect(Number(clipRect?.getAttribute('x'))).toBe(96)
        expect(Number(clipRect?.getAttribute('width'))).toBe(1056)
        expect(title?.getAttribute('clip-path')).toMatch(/-text-clip\)$/)
    })

    it('renders an opaque theme base beneath external backgrounds', () => {
        const light = render({}, { variant: 'light' })
        const dark = render({}, { variant: 'dark' })

        expect(light.querySelector('svg > rect')?.getAttribute('fill')).toBe('#F4F4F4')
        expect(dark.querySelector('svg > rect')?.getAttribute('fill')).toBe('#001632')
    })

    it('uses light text on dark backgrounds and dark text on light backgrounds', () => {
        const dark = render({ subtitle: 'Dark theme' })
        const light = render({ subtitle: 'Light theme' }, { variant: 'light' })

        const titleFill = doc => doc.querySelectorAll('text')[0].getAttribute('fill')
        expect(titleFill(dark)).toBe('#F4F4F4')
        expect(titleFill(light)).toBe('#001632')
    })

    it('renders the scrim gradient only when enabled', () => {
        expect(render({ scrim: 'subtle' }).querySelector('[id$="-scrim"]')).not.toBeNull()
        expect(render({ scrim: 'off' }).querySelector('[id$="-scrim"]')).toBeNull()
    })

    it('only emits the clip path for the selected image layout', () => {
        const circle = render({
            imageLayout: 'circle',
            layoutImage: { dataUrl: 'data:image/png;base64,uploaded' },
        })

        expect(circle.querySelector('[id$="-circle-clip"]')).not.toBeNull()
        expect(circle.querySelector('[id$="-split-clip"]')).toBeNull()
        expect(circle.querySelector('[id$="-overlay-clip"]')).toBeNull()
    })

    it('produces valid SVG markup', () => {
        const doc = render({ pill: 'Announcement', subtitle: 'What is new this month' })

        expect(doc.querySelector('parsererror')).toBeNull()
        expect(doc.documentElement.tagName).toBe('svg')
    })
})
