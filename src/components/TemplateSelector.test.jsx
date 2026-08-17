// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TemplateSelector } from './TemplateSelector'

// Smoke test: catches JSX/import regressions that would break the build and
// verifies the template options render from the registry.
describe('TemplateSelector', () => {
    it('renders template options and reflects the selected id', () => {
        render(
            <TemplateSelector selectedTemplateId="dotnet-community-standup" onTemplateChange={vi.fn()} />
        )

        const select = screen.getByLabelText(/layout template/i)
        expect(select).toHaveValue('dotnet-community-standup')
        expect(screen.getByRole('option', { name: /community standup/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Azure Developers Live' })).toBeInTheDocument()
    })
})
