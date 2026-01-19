import { useCallback, useRef } from 'react'
import { escapeXml, getTextMeasureContext, parseResolution, wrapTextToWidth } from '../utils/svgUtils'
import { replaceTokens } from '../utils/svgTemplateProcessor'

// Template paths for different guest counts
const TEMPLATE_PATHS = {
    1: '/thumbnail-generator/templates/on-dotnet-live/on-dotnet-thumbnai-one-guest.svg',
    2: '/thumbnail-generator/templates/on-dotnet-live/on-dotnet-thumbnai-two-guests.svg',
}

// Module-level cache for templates (synchronous access after loading)
const templateCache = {
    templates: {},
    loading: {},

    get(guestCount) {
        return this.templates[guestCount] || null
    },

    load(guestCount) {
        if (this.templates[guestCount] || this.loading[guestCount]) {
            return
        }

        this.loading[guestCount] = true
        const path = TEMPLATE_PATHS[guestCount] || TEMPLATE_PATHS[1]

        fetch(path)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load: ${response.statusText}`)
                return response.text()
            })
            .then(content => {
                this.templates[guestCount] = content
                this.loading[guestCount] = false
            })
            .catch(err => {
                console.error(`Failed to load template for ${guestCount} guests:`, err)
                this.loading[guestCount] = false
            })
    },
}

// Pre-load all templates on module initialization
Object.keys(TEMPLATE_PATHS).forEach(count => {
    templateCache.load(parseInt(count, 10))
})

export function OnDotNetLiveTemplate({
    values,
    resolution,
}) {
    const templateRef = useRef(null)

    const {
        title = '',
        guestCount = '1',
        guest1Name = '',
        guest2Name = '',
        day = '',
        time = '',
        guests = [],
    } = values

    const numGuests = Math.min(2, Math.max(1, parseInt(guestCount, 10) || 1))

    // Get cached template (synchronous - templates pre-loaded on module init)
    templateRef.current = templateCache.get(numGuests)

    // Ensure template is loading if not already
    if (!templateRef.current && !templateCache.loading[numGuests]) {
        templateCache.load(numGuests)
    }

    const generateSvg = useCallback(() => {
        const [width, height] = parseResolution(resolution)
        const templateContent = templateRef.current

        if (!templateContent) {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                    <rect width="${width}" height="${height}" fill="#f0f0f0"/>
                    <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#666">
                        Loading template...
                    </text>
                </svg>
            `
        }

        const getGuestImage = (index) => {
            const guest = guests[index]
            if (guest) return guest.dataUrl || guest.url || ''
            return ''
        }

        const measureCtx = getTextMeasureContext()
        const titleFont = '600 88px "Segoe UI"'
        const titleMaxWidth = 924
        const ellipsizeToWidth = (text, maxWidth) => {
            if (!text || !measureCtx || !maxWidth || maxWidth <= 0) return text

            measureCtx.font = titleFont
            if (measureCtx.measureText(text).width <= maxWidth) return text

            const ellipsis = '…'
            const trimmed = text.trim()
            let low = 0
            let high = trimmed.length

            while (low < high) {
                const mid = Math.ceil((low + high) / 2)
                const candidate = trimmed.slice(0, mid).trimEnd() + ellipsis
                if (measureCtx.measureText(candidate).width <= maxWidth) {
                    low = mid
                } else {
                    high = mid - 1
                }
            }

            const finalCandidate = trimmed.slice(0, low).trimEnd() + ellipsis
            return finalCandidate
        }

        const wrappedTitleLines = wrapTextToWidth(String(title || '').trim(), titleMaxWidth, measureCtx, titleFont)
        const titleLine1 = wrappedTitleLines[0] || ''
        const titleLine2 = wrappedTitleLines[1] || ''
        const titleLine3Raw = wrappedTitleLines.length > 2 ? wrappedTitleLines.slice(2).join(' ') : ''
        const titleLine3 = titleLine3Raw ? ellipsizeToWidth(titleLine3Raw, titleMaxWidth) : ''

        const tokens = {
            TITLE: escapeXml(title),
            TITLE_LINE_1: escapeXml(titleLine1),
            TITLE_LINE_2: escapeXml(titleLine2),
            TITLE_LINE_3: escapeXml(titleLine3),
            GUEST_1_NAME: escapeXml(guest1Name),
            GUEST_2_NAME: escapeXml(guest2Name),
            DAY: escapeXml(day),
            TIME: escapeXml(time),
            GUEST_1: getGuestImage(0),
            GUEST_2: getGuestImage(1),
        }

        let svg = replaceTokens(templateContent, tokens)

        // Scale the SVG if resolution differs from template's 1920x1080
        if (width !== 1920 || height !== 1080) {
            svg = svg.replace(/width="1920"/, `width="${width}"`)
            svg = svg.replace(/height="1080"/, `height="${height}"`)
        }

        return svg
    }, [resolution, title, guest1Name, guest2Name, day, time, guests])

    return { generateSvg }
}

export default OnDotNetLiveTemplate
