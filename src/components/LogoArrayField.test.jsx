// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogoArrayField } from './LogoArrayField'

describe('LogoArrayField', () => {
    it('rejects SVG uploads', () => {
        const onChange = vi.fn()
        const showToast = vi.fn()
        const { container } = render(
            <LogoArrayField label="Logos" onChange={onChange} showToast={showToast} />
        )
        const input = container.querySelector('input[type="file"]')

        fireEvent.change(input, {
            target: { files: [new File(['<svg />'], 'logo.svg', { type: 'image/svg+xml' })] },
        })

        expect(onChange).not.toHaveBeenCalled()
        expect(showToast).toHaveBeenCalledWith(
            'SVG logos are not supported. Choose a raster image.',
            'error'
        )
        expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/gif,image/webp,image/avif')
    })
})
