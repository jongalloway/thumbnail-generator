// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogoArrayField } from './LogoArrayField'

describe('LogoArrayField', () => {
    it('shows product names as tooltips for available logos', () => {
        const availableLogos = [
            { id: 'nuget', name: 'NuGet', url: '/logos/nuget.svg' },
            { id: 'visual-studio-code', name: 'Visual Studio Code', url: '/logos/visual-studio-code.png' },
        ]

        render(
            <LogoArrayField
                label="Logos"
                onChange={vi.fn()}
                availableLogos={availableLogos}
            />
        )

        for (const logo of availableLogos) {
            const button = screen.getByRole('button', { name: `${logo.name} logo` })
            const tooltip = screen.getByRole('tooltip', { name: logo.name })

            expect(button).toHaveAttribute('aria-describedby', tooltip.id)
        }
    })

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
