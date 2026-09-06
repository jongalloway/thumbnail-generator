// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useExport } from './useExport'

const pptxMocks = vi.hoisted(() => ({
    addImage: vi.fn(),
    addSlide: vi.fn(),
    defineLayout: vi.fn(),
    write: vi.fn(),
    presentation: null,
}))

vi.mock('pptxgenjs', () => ({
    default: vi.fn(function MockPptxGenJS() {
        pptxMocks.presentation = this
        this.addSlide = pptxMocks.addSlide
        this.defineLayout = pptxMocks.defineLayout
        this.write = pptxMocks.write
    }),
}))

describe('useExport', () => {
    let anchorClick

    beforeEach(() => {
        vi.clearAllMocks()
        anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
        pptxMocks.addSlide.mockReturnValue({ addImage: pptxMocks.addImage })
        pptxMocks.write.mockResolvedValue(new Blob(['pptx']))
    })

    it('exports a custom-size slide containing the thumbnail as SVG', async () => {
        const showToast = vi.fn()
        const generateSvg = vi.fn(() => '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fff"/></svg>')
        const { result } = renderHook(() => useExport(generateSvg, '1200x630', showToast, 'Test Thumbnail'))

        await act(async () => {
            await result.current.exportPptx()
        })

        expect(pptxMocks.defineLayout).toHaveBeenCalledWith({
            name: 'THUMBNAIL',
            width: 13.333,
            height: expect.closeTo(6.999825, 5),
        })
        expect(pptxMocks.addImage).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.stringMatching(/^data:image\/svg\+xml/),
            x: 0,
            y: 0,
            w: 13.333,
            h: expect.closeTo(6.999825, 5),
        }))
        expect(pptxMocks.write).toHaveBeenCalledWith({ outputType: 'blob' })
        expect(anchorClick.mock.instances[0].download).toBe('test-thumbnail.pptx')
        expect(showToast).toHaveBeenCalledWith('PPTX exported successfully!')
    })
})
