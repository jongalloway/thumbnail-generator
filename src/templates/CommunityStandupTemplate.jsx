import { useCallback, useRef } from 'react'
import { escapeXml, parseResolution } from '../utils/svgUtils'
import { replaceTokens, wrapTopicText } from '../utils/svgTemplateProcessor'

/**
 * .NET Community Standup Template
 * 
 * Uses SVG template files from public/templates/dotnet-community-standup/
 * for layout definitions. Edit the SVG files directly to update positioning,
 * sizing, and styling without modifying this JSX file.
 * 
 * Template files:
 * - two-guests.svg: Layout for 2 guest photos
 * - three-guests.svg: Layout for 3 guest photos  
 * - four-guests.svg: Layout for 4 guest photos
 * 
 * Token format: __TOKEN_NAME__ (double underscores for Inkscape compatibility)
 * Supported tokens:
 * - __BACKGROUND__: Background image URL
 * - __PILL_LINE_1__, __PILL_LINE_2__: Pill/badge text (two lines, centered)
 * - __TOPIC_LINE_1__, __TOPIC_LINE_2__, __TOPIC_LINE_3__: Topic text lines
 * - __GUEST_1__, __GUEST_2__, __GUEST_3__, __GUEST_4__: Guest photo URLs
 */

// Template paths for different guest counts
const TEMPLATE_PATHS = {
    2: '/thumbnail-generator/templates/dotnet-community-standup/two-guests.svg',
    3: '/thumbnail-generator/templates/dotnet-community-standup/three-guests.svg',
    4: '/thumbnail-generator/templates/dotnet-community-standup/four-guests.svg',
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
        const path = TEMPLATE_PATHS[guestCount] || TEMPLATE_PATHS[3]

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
    }
}

// Pre-load all templates on module initialization
Object.keys(TEMPLATE_PATHS).forEach(count => {
    templateCache.load(parseInt(count, 10))
})

export function CommunityStandupTemplate({
    values,
    selectedBackground,
    resolution,
}) {
    // Use same hooks as DotNetBlogTemplate to maintain consistent hook order
    const templateRef = useRef(null)

    const { pill = '', topic = '', guestCount = '3', guests = [] } = values
    const numGuests = parseInt(guestCount, 10) || 3

    // Get cached template (synchronous - templates pre-loaded on module init)
    templateRef.current = templateCache.get(numGuests)

    // Ensure template is loading if not already
    if (!templateRef.current && !templateCache.loading[numGuests]) {
        templateCache.load(numGuests)
    }

    const generateSvg = useCallback(() => {
        const [width, height] = parseResolution(resolution)
        const bgUrl = selectedBackground?.url || ''
        const templateContent = templateRef.current

        // If template isn't loaded yet, return a loading placeholder
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

        // Wrap topic text into lines (limit to ~18 chars per line to stay within 55% width)
        const topicLines = wrapTopicText(topic, 18, 3)

        // Build guest placeholder for empty slots
        const getGuestImage = (index) => {
            const guest = guests[index]
            if (guest) {
                return guest.dataUrl || guest.url || ''
            }
            return ''
        }

        // Split pill text into two lines for the two-line format
        const pillLines = pill.split('\n')
        const pillLine1 = pillLines[0] || ''
        const pillLine2 = pillLines[1] || ''

        // Create tokens for replacement
        const tokens = {
            BACKGROUND: bgUrl,
            PILL_LINE_1: escapeXml(pillLine1),
            PILL_LINE_2: escapeXml(pillLine2),
            TOPIC_LINE_1: escapeXml(topicLines[0] || ''),
            TOPIC_LINE_2: escapeXml(topicLines[1] || ''),
            TOPIC_LINE_3: escapeXml(topicLines[2] || ''),
            GUEST_1: getGuestImage(0),
            GUEST_2: getGuestImage(1),
            GUEST_3: getGuestImage(2),
            GUEST_4: getGuestImage(3),
        }

        // Replace tokens in the template
        let svg = replaceTokens(templateContent, tokens)

        // Scale the SVG if resolution differs from template's 1920x1080
        if (width !== 1920 || height !== 1080) {
            svg = svg.replace(/width="1920"/, `width="${width}"`)
            svg = svg.replace(/height="1080"/, `height="${height}"`)
        }

        return svg
    }, [resolution, selectedBackground, pill, topic, guests])

    return { generateSvg }
}

export default CommunityStandupTemplate
