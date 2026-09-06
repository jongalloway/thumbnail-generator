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

export function escapeXmlPreservingSpaces(text) {
    return escapeXml(text).replace(/ {2,}/g, spaces => '\u00a0'.repeat(spaces.length))
}

/**
 * Wrap text into lines based on character limit
 */
export function wrapText(text, maxChars) {
    if (!text) return []
    const lines = []

    text.split(/\r?\n/).forEach((paragraph) => {
        const tokens = paragraph.match(/\s+|[^\s]+/g) || []
        let currentLine = ''

        tokens.forEach(token => {
            const next = currentLine + token
            if (/^\s+$/.test(token) || next.length <= maxChars) {
                currentLine = next
            } else {
                if (currentLine.trim()) lines.push(currentLine.trimEnd())
                currentLine = token.trimStart()
            }
        })

        if (currentLine.trim()) lines.push(currentLine.trimEnd())
    })

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
    const lines = []

    text.split(/\r?\n/).forEach((paragraph) => {
        const tokens = paragraph.match(/\s+|[^\s]+/g) || []
        let current = ''

        for (const token of tokens) {
            const next = current + token
            if (/^\s+$/.test(token)) {
                current = next
                continue
            }
            if (ctx.measureText(next).width <= maxWidth) {
                current = next
                continue
            }

            if (current.trim()) lines.push(current.trimEnd())
            current = token.trimStart()
        }

        if (current.trim()) lines.push(current.trimEnd())
    })

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
 * Convert a Blob to a data URL for self-contained SVG exports.
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

function decodeSvgDataUrl(dataUrl) {
    const commaIndex = dataUrl.indexOf(',')
    if (commaIndex === -1) return null

    const metadata = dataUrl.slice(0, commaIndex)
    const encoded = dataUrl.slice(commaIndex + 1)
    if (!metadata.includes(';base64')) return decodeURIComponent(encoded)

    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

/**
 * Merge SVG images into the outer SVG document so PowerPoint can render them reliably.
 */
export function flattenNestedSvgImages(svgString) {
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
        .filter(image => {
            const href = image.getAttribute('href') || image.getAttribute('xlink:href') || ''
            return href.startsWith('data:image/svg+xml')
        })

    images.forEach(image => {
        const href = image.getAttribute('href') || image.getAttribute('xlink:href')
        const nestedSource = decodeSvgDataUrl(href)
        if (!nestedSource) return

        const nestedDocument = parser.parseFromString(nestedSource, 'image/svg+xml')
        const nestedSvg = nestedDocument.documentElement
        if (!nestedSvg || nestedSvg.nodeName.toLowerCase() !== 'svg' || nestedDocument.querySelector('parsererror')) {
            return
        }

        const importedSvg = doc.importNode(nestedSvg, true)
        const placementAttributes = ['x', 'y', 'width', 'height', 'preserveAspectRatio', 'filter', 'mask', 'opacity', 'transform', 'style']
        placementAttributes.forEach(attribute => {
            const value = image.getAttribute(attribute)
            if (value !== null) importedSvg.setAttribute(attribute, value)
        })
        image.replaceWith(importedSvg)
    })

    return new XMLSerializer().serializeToString(svg)
}
