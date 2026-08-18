// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogoArrayField } from './LogoArrayField'

describe('LogoArrayField', () => {
    it('accepts SVG uploads', async () => {
        const onChange = vi.fn()
        const showToast = vi.fn()
        const { container } = render(
            <LogoArrayField label="Logos" onChange={onChange} showToast={showToast} />
        )
        const input = container.querySelector('input[type="file"]')

        fireEvent.change(input, {
            target: { files: [new File(['<svg />'], 'logo.svg', { type: 'image/svg+xml' })] },
        })

        await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
        expect(onChange).toHaveBeenCalledWith([
            expect.objectContaining({
                name: 'logo.svg',
                isUploaded: true,
                dataUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
            }),
        ])
        expect(showToast).not.toHaveBeenCalled()
        expect(input).toHaveAttribute('accept', 'image/svg+xml,image/png,image/jpeg,image/gif,image/webp,image/avif')
    })
})
