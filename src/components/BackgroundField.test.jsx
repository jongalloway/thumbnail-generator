// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BackgroundField } from './BackgroundField'

describe('BackgroundField', () => {
    it('accepts an SVG background upload', async () => {
        const onChange = vi.fn()
        const { container } = render(
            <BackgroundField
                backgrounds={[{ id: 'preset', name: 'Preset', url: '/preset.png', variant: 'dark' }]}
                value={{ id: 'preset', name: 'Preset', url: '/preset.png', variant: 'dark' }}
                variant="light"
                onChange={onChange}
            />
        )
        const input = container.querySelector('input[type="file"]')

        fireEvent.change(input, {
            target: { files: [new File(['<svg />'], 'background.svg', { type: 'image/svg+xml' })] },
        })

        await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            name: 'background.svg',
            isUploaded: true,
            variant: 'light',
            url: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
        }))
        expect(input).toHaveAttribute('accept', 'image/svg+xml,image/png,image/jpeg,image/gif,image/webp,image/avif')
    })

    it('accepts an SVG upload when the browser omits its MIME type', async () => {
        const onChange = vi.fn()
        const { container } = render(
            <BackgroundField backgrounds={[]} value={null} variant="dark" onChange={onChange} />
        )

        fireEvent.change(container.querySelector('input[type="file"]'), {
            target: { files: [new File(['<svg />'], 'background.svg')] },
        })

        await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            name: 'background.svg',
            isUploaded: true,
        }))
    })

    it('shows the uploaded background in the selector and preview', () => {
        const uploaded = {
            id: 'uploaded',
            name: 'custom.svg',
            url: 'data:image/svg+xml;base64,PHN2ZyAvPg==',
            variant: 'dark',
            isUploaded: true,
        }

        const { container } = render(<BackgroundField backgrounds={[]} value={uploaded} variant="dark" onChange={vi.fn()} />)

        expect(screen.getByRole('option', { name: 'custom.svg' })).toBeInTheDocument()
        expect(within(container.querySelector('.background-upload-preview')).getByText('custom.svg')).toBeInTheDocument()
    })
})