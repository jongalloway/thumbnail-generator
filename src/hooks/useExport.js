import { useCallback } from 'react'
import { parseResolution, inlineSvgImages } from '../utils/svgUtils'

/**
 * Hook for exporting thumbnails as raster images or SVG
 */
export function useExport(generateSvg, resolution, showToast) {
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
                a.download = `thumbnail-${Date.now()}.${extension}`
                a.click()
                URL.revokeObjectURL(downloadUrl)
                showToast(`${extension.toUpperCase()} exported successfully!`)
            }, mimeType, quality)
        } catch (err) {
            console.error('Export failed:', err)
            showToast('Export failed. Try SVG export instead.', 'error')
        }
    }, [resolution, generateSvg, showToast])

    // Export as SVG
    const exportSvg = useCallback(() => {
        const svgString = generateSvg()
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `thumbnail-${Date.now()}.svg`
        a.click()
        URL.revokeObjectURL(url)
        showToast('SVG exported successfully!')
    }, [generateSvg, showToast])

    return {
        exportRaster,
        exportSvg,
    }
}
