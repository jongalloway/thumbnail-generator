import { useCallback } from 'react'
import { blobToDataUrl, parseResolution, inlineSvgImages, flattenNestedSvgImages } from '../utils/svgUtils'

const PPTX_SLIDE_WIDTH = 13.333

/**
 * Convert a title string to kebab-case for use in filenames
 */
function toKebabCase(title) {
    if (!title) return 'thumbnail'
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'thumbnail'
}

/**
 * Hook for exporting thumbnails as raster images, SVG, or PowerPoint
 */
export function useExport(generateSvg, resolution, showToast, title) {
    // Export as raster (JPG/PNG/WEBP)
    const exportRaster = useCallback(async (format = 'jpg') => {
        const [width, height] = parseResolution(resolution)
        const svgString = generateSvg()

        // Check for WebP support if WebP format is selected
        const fmt = (format || 'jpg').toLowerCase()
        if (fmt === 'webp') {
            const canvas = document.createElement('canvas')
            const isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
            if (!isWebPSupported) {
                showToast('WebP format is not supported in this browser. Try JPG or PNG instead.', 'error')
                return
            }
        }

        try {
            const inlinedSvg = await inlineSvgImages(svgString)

            const mimeType = fmt === 'png' ? 'image/png' : (fmt === 'webp' ? 'image/webp' : 'image/jpeg')
            const extension = fmt === 'png' ? 'png' : (fmt === 'webp' ? 'webp' : 'jpg')
            const quality = mimeType === 'image/png' ? undefined : 0.92

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Failed to get canvas context')

            const img = new Image()
            img.crossOrigin = 'anonymous'
            const svgBlob = new Blob([inlinedSvg], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(svgBlob)

            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = () => reject(new Error('Failed to load SVG image'))
                img.src = url
            })

            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url)

                if (!blob) {
                    showToast('Export failed. Try SVG export instead.', 'error')
                    return
                }
                const downloadUrl = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = downloadUrl
                a.download = `${toKebabCase(title)}.${extension}`
                a.click()
                URL.revokeObjectURL(downloadUrl)
                showToast(`${extension.toUpperCase()} exported successfully!`)
            }, mimeType, quality)
        } catch (err) {
            console.error('Export failed:', err)
            showToast('Export failed. Try SVG export instead.', 'error')
        }
    }, [resolution, generateSvg, showToast, title])

    // Export as SVG with embedded bitmap assets so it remains self-contained.
    const exportSvg = useCallback(async () => {
        const svgString = generateSvg()
        try {
            const inlinedSvg = await inlineSvgImages(svgString)
            const blob = new Blob([inlinedSvg], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${toKebabCase(title)}.svg`
            a.click()
            URL.revokeObjectURL(url)
            showToast('SVG exported successfully!')
        } catch (err) {
            console.error('SVG export failed:', err)
            showToast('SVG export failed.', 'error')
        }
    }, [generateSvg, showToast, title])

    // Export a one-slide presentation containing the thumbnail as an SVG image.
    const exportPptx = useCallback(async () => {
        const [width, height] = parseResolution(resolution)

        try {
            const inlinedSvg = await inlineSvgImages(generateSvg())
            const powerpointCompatibleSvg = flattenNestedSvgImages(inlinedSvg)
            const svgDataUrl = await blobToDataUrl(new Blob([powerpointCompatibleSvg], { type: 'image/svg+xml;charset=utf-8' }))
            const slideHeight = PPTX_SLIDE_WIDTH * (height / width)
            const { default: PptxGenJS } = await import('pptxgenjs')
            const pptx = new PptxGenJS()

            pptx.author = 'Thumbnail Generator'
            pptx.subject = 'Editable SVG thumbnail'
            pptx.title = title || 'Thumbnail'
            pptx.defineLayout({ name: 'THUMBNAIL', width: PPTX_SLIDE_WIDTH, height: slideHeight })
            pptx.layout = 'THUMBNAIL'

            const slide = pptx.addSlide()
            slide.addImage({
                data: svgDataUrl,
                x: 0,
                y: 0,
                w: PPTX_SLIDE_WIDTH,
                h: slideHeight,
                altText: title || 'Generated thumbnail',
            })

            const blob = await pptx.write({ outputType: 'blob' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${toKebabCase(title)}.pptx`
            a.click()
            URL.revokeObjectURL(url)
            showToast('PPTX exported successfully!')
        } catch (err) {
            console.error('PPTX export failed:', err)
            showToast('PPTX export failed. Try SVG export instead.', 'error')
        }
    }, [generateSvg, resolution, showToast, title])

    // Copy preview to clipboard as PNG
    const copyToClipboard = useCallback(async () => {
        const [width, height] = parseResolution(resolution)
        const svgString = generateSvg()

        let url
        try {
            const inlinedSvg = await inlineSvgImages(svgString)

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Failed to get canvas context')

            const img = new Image()
            img.crossOrigin = 'anonymous'
            const svgBlob = new Blob([inlinedSvg], { type: 'image/svg+xml;charset=utf-8' })
            url = URL.createObjectURL(svgBlob)

            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = () => reject(new Error('Failed to load SVG image'))
                img.src = url
            })

            ctx.drawImage(img, 0, 0, width, height)

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
            if (!blob) {
                showToast('Failed to copy to clipboard.', 'error')
                return
            }
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ])
            showToast('Copied to clipboard!')
        } catch (err) {
            console.error('Copy to clipboard failed:', err)
            showToast('Failed to copy to clipboard.', 'error')
        } finally {
            if (url) URL.revokeObjectURL(url)
        }
    }, [resolution, generateSvg, showToast])

    return {
        exportRaster,
        exportSvg,
        exportPptx,
        copyToClipboard,
    }
}
