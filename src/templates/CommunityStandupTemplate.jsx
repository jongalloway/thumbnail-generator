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
 * - __PILL_Y__, __PILL_TEXT_1_Y__, __PILL_TEXT_2_Y__: Pill position (shifts up when names present)
 * - __PILL_LINE_1__, __PILL_LINE_2__: Pill/badge text (two lines, centered)
 * - __TOPIC_LINE_1_Y__, __TOPIC_LINE_2_Y__, __TOPIC_LINE_3_Y__: Topic Y positions
 * - __TOPIC_LINE_1__, __TOPIC_LINE_2__, __TOPIC_LINE_3__: Topic text lines
 * - __GUEST_1__, __GUEST_2__, __GUEST_3__, __GUEST_4__: Guest photo URLs
 * - __GUEST_NAME_LINE_1__, __GUEST_NAME_LINE_2__: Guest names (two lines)
 * 
 * Guest names are entered in a single field, delimited by , or +
 * When names are present, the pill and topic shift up to make room.
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

/**
 * Parse guest names from input string
 * Names can be delimited by , or +
 * Returns an array of trimmed names
 */
function parseGuestNames(input) {
    if (!input || !input.trim()) return []
    // Split on comma or plus (with optional surrounding whitespace)
    return input.split(/\s*[,+]\s*/).map(name => name.trim()).filter(Boolean)
}

/**
 * Format guest names for display on two lines
 * For 2+ guests: "with Name1 +" on line 1, remaining names on line 2
 */
function formatGuestNameLines(names) {
    if (!names || names.length === 0) {
        return { line1: '', line2: '' }
    }

    if (names.length === 1) {
        return { line1: `with ${names[0]}`, line2: '' }
    }

    // First name on line 1 with "+"
    const line1 = `with ${names[0]} +`

    // Remaining names on line 2, joined with " + "
    const line2 = names.slice(1).join(' + ')

    return { line1, line2 }
}

export function CommunityStandupTemplate({
    values,
    selectedBackground,
    resolution,
}) {
    // Use same hooks as DotNetBlogTemplate to maintain consistent hook order
    const templateRef = useRef(null)

    const { pillLine1 = '', topic = '', guests = [], guestNames = '' } = values

    // Auto-detect guest count from uploaded photos (clamp to 2-4)
    const numGuests = Math.max(2, Math.min(4, guests.length || 2))

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

        // Parse and format guest names
        const parsedNames = parseGuestNames(guestNames)
        const hasGuestNames = parsedNames.length > 0
        const { line1: guestNameLine1, line2: guestNameLine2 } = formatGuestNameLines(parsedNames)

        // Calculate Y positions based on whether guest names are present
        // Without guest names: topic can be lower on the canvas (more centered)
        // With guest names: shift pill and topic up to make room for names at bottom
        let pillY, pillText1Y, pillText2Y, topicLine1Y, topicLine2Y, topicLine3Y

        if (hasGuestNames) {
            // Shifted up to make room for guest names at bottom
            pillY = 50
            pillText1Y = 115
            pillText2Y = 165
            topicLine1Y = 355
            topicLine2Y = 487
            topicLine3Y = 619
        } else {
            // No guest names - topic can be lower/more centered
            pillY = 50
            pillText1Y = 115
            pillText2Y = 165
            topicLine1Y = 380
            topicLine2Y = 520
            topicLine3Y = 660
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

        // Pill line 2 is fixed for Community Standup templates
        const pillLine2 = 'COMMUNITY STANDUP'

        // Create tokens for replacement
        const tokens = {
            BACKGROUND: bgUrl,
            // Position tokens
            PILL_Y: pillY,
            PILL_TEXT_1_Y: pillText1Y,
            PILL_TEXT_2_Y: pillText2Y,
            TOPIC_LINE_1_Y: topicLine1Y,
            TOPIC_LINE_2_Y: topicLine2Y,
            TOPIC_LINE_3_Y: topicLine3Y,
            // Content tokens
            PILL_LINE_1: escapeXml(pillLine1),
            PILL_LINE_2: escapeXml(pillLine2),
            TOPIC_LINE_1: escapeXml(topicLines[0] || ''),
            TOPIC_LINE_2: escapeXml(topicLines[1] || ''),
            TOPIC_LINE_3: escapeXml(topicLines[2] || ''),
            GUEST_1: getGuestImage(0),
            GUEST_2: getGuestImage(1),
            GUEST_3: getGuestImage(2),
            GUEST_4: getGuestImage(3),
            GUEST_NAME_LINE_1: escapeXml(guestNameLine1),
            GUEST_NAME_LINE_2: escapeXml(guestNameLine2),
        }

        // Replace tokens in the template
        let svg = replaceTokens(templateContent, tokens)

        // Scale the SVG if resolution differs from template's 1920x1080
        if (width !== 1920 || height !== 1080) {
            svg = svg.replace(/width="1920"/, `width="${width}"`)
            svg = svg.replace(/height="1080"/, `height="${height}"`)
        }

        return svg
    }, [resolution, selectedBackground, pillLine1, topic, guests, guestNames])

    return { generateSvg }
}

export default CommunityStandupTemplate
