/**
 * Shared utilities for SVG generation and text handling
 */

/**
 * Escape XML special characters for safe embedding in SVG
 */
export function escapeXml(text) {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * Wrap text into lines based on character limit
 */
export function wrapText(text, maxChars) {
    if (!text) return []
    const words = text.split(' ')
    const lines = []
    let currentLine = ''

    words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length <= maxChars) {
            currentLine = (currentLine + ' ' + word).trim()
        } else {
            if (currentLine) lines.push(currentLine)
            currentLine = word
        }
    })

    if (currentLine) lines.push(currentLine)
    return lines
}

/**
 * Wrap text to a specific pixel width using canvas measurement
 */
export function wrapTextToWidth(text, maxWidth, ctx, font) {
    if (!text) return []
    if (!ctx || !font || !Number.isFinite(maxWidth) || maxWidth <= 0) {
        return wrapText(text, 22)
    }

    ctx.font = font
    const words = text.split(/\s+/).filter(Boolean)
    const lines = []
    let current = ''

    for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (ctx.measureText(next).width <= maxWidth) {
            current = next
            continue
        }

        if (current) lines.push(current)
        current = word
    }

    if (current) lines.push(current)
    return lines
}

/**
 * Parse resolution string like "1920x1080" to [width, height]
 */
export function parseResolution(resolution) {
    let width = 1920
    let height = 1080
    if (typeof resolution === 'string') {
        const match = resolution.trim().match(/^(\d+)\s*x\s*(\d+)$/i)
        if (match) {
            const parsedWidth = Number(match[1])
            const parsedHeight = Number(match[2])
            if (Number.isFinite(parsedWidth) && Number.isFinite(parsedHeight) && parsedWidth > 0 && parsedHeight > 0) {
                width = parsedWidth
                height = parsedHeight
            }
        }
    }
    return [width, height]
}

/**
 * Convert a Blob to a data URL
 */
export function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Failed to read blob'))
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(blob)
    })
}

/**
 * Generate a unique ID for SVG elements
 */
export function generateUniqueId(prefix = 'svg') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Get a text measurement context (creates an offscreen canvas)
 */
export function getTextMeasureContext() {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    return canvas.getContext('2d')
}

/**
 * Inline external images in SVG as data URLs (for export)
 */
const FETCH_TIMEOUT_MS = 10000

export async function inlineSvgImages(svgString) {
    if (typeof window === 'undefined' || !svgString) return svgString

    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const svg = doc.documentElement
    if (!svg || svg.nodeName.toLowerCase() !== 'svg') return svgString

    if (!svg.getAttribute('xmlns')) {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }
    if (!svg.getAttribute('xmlns:xlink')) {
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    }

    const images = Array.from(svg.querySelectorAll('image'))
    await Promise.all(images.map(async (img) => {
        const href = img.getAttribute('href') || img.getAttribute('xlink:href')
        if (!href || href.startsWith('data:')) return

        let absoluteUrl
        try {
            absoluteUrl = new URL(href, window.location.href).toString()
        } catch {
            return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        try {
            const response = await fetch(absoluteUrl, { mode: 'cors', signal: controller.signal })
            clearTimeout(timeoutId)
            if (!response.ok) {
                console.warn('inlineSvgImages: Failed to inline image', { url: absoluteUrl, status: response.status })
                return
            }
            const blob = await response.blob()
            const dataUrl = await blobToDataUrl(blob)
            img.setAttribute('href', dataUrl)
            img.setAttribute('xlink:href', dataUrl)
        } catch (error) {
            clearTimeout(timeoutId)
            console.warn('inlineSvgImages: Error while inlining image', { url: absoluteUrl, error })
        }
    }))

    return new XMLSerializer().serializeToString(svg)
}
