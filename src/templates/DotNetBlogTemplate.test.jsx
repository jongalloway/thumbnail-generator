// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DotNetBlogTemplate } from './DotNetBlogTemplate'

describe('DotNetBlogTemplate', () => {
    it('renders single artwork unmasked so PNG transparency reveals the background', () => {
        const { result } = renderHook(() => DotNetBlogTemplate({
            values: {
                title: 'Transparent artwork',
                imageLayout: 'artwork',
                layoutImage: { dataUrl: 'data:image/png;base64,transparent-artwork' },
            },
            selectedBackground: { url: '/background.png' },
            variant: 'light',
            resolution: '1920x1080',
        }))

        const document = new DOMParser().parseFromString(result.current.generateSvg(), 'image/svg+xml')
        const artwork = [...document.querySelectorAll('image')]
            .find(image => image.getAttribute('href')?.includes('transparent-artwork'))

        expect(artwork).not.toBeUndefined()
        expect(artwork.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
        expect(artwork.hasAttribute('clip-path')).toBe(false)
        expect(document.querySelector('[id$="-circle-clip"]')).toBeNull()
        expect(document.querySelector('[id$="-split-clip"]')).toBeNull()
    })
})