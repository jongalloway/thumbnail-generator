import { useCallback, useEffect, useRef, useState } from 'react'
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
 * - __TOPIC_LINE_1_Y__, __TOPIC_LINE_2_Y__, __TOPIC_LINE_3_Y__, __TOPIC_LINE_4_Y__: Topic Y positions
 * - __TOPIC_LINE_1__, __TOPIC_LINE_2__, __TOPIC_LINE_3__, __TOPIC_LINE_4__: Topic text lines
 * - __GUEST_1__, __GUEST_2__, __GUEST_3__, __GUEST_4__: Guest photo URLs
 * - __GUEST_NAME_LINE_1__, __GUEST_NAME_LINE_2__, __GUEST_NAME_LINE_3__: Guest names (up to three lines)
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

// Module-level cache for templates with subscriber notification
const templateCache = {
    templates: {},
    loading: {},
    subscribers: new Set(),

    get(guestCount) {
        return this.templates[guestCount] || null
    },

    subscribe(callback) {
        this.subscribers.add(callback)
        return () => this.subscribers.delete(callback)
    },

    notify() {
        this.subscribers.forEach(cb => cb())
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
                this.notify()
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
 * Format guest names for display on up to three lines
 * 1 guest: "with Name1" on line 1
 * 2 guests: "with Name1 +" on line 1, "Name2" on line 2
 * 3 guests: "with Name1 +" on line 1, "Name2 + Name3" on line 2
 * 4+ guests: "with Name1 +" on line 1, "Name2 + Name3 +" on line 2, remaining on line 3
 */
function formatGuestNameLines(names) {
    if (!names || names.length === 0) {
        return { line1: '', line2: '', line3: '' }
    }

    if (names.length === 1) {
        return { line1: `with ${names[0]}`, line2: '', line3: '' }
    }

    if (names.length === 2) {
        return { line1: `with ${names[0]} +`, line2: names[1], line3: '' }
    }

    if (names.length === 3) {
        return { line1: `with ${names[0]} +`, line2: `${names[1]} + ${names[2]}`, line3: '' }
    }

    // 4+ guests: spread across 3 lines
    const line1 = `with ${names[0]} +`
    const line2 = `${names[1]} + ${names[2]} +`
    const line3 = names.slice(3).join(' + ')

    return { line1, line2, line3 }
}

export function CommunityStandupTemplate({
    values,
    selectedBackground,
    resolution,
}) {
    // Use same hooks as DotNetBlogTemplate to maintain consistent hook order
    const templateRef = useRef(null)
    const [, setTemplateVersion] = useState(0)

    const { pillLine1 = '', topic = '', guests = [], guestNames = '' } = values

    // Auto-detect guest count from uploaded photos (clamp to 2-4)
    const numGuests = Math.max(2, Math.min(4, guests.length || 2))

    // Subscribe to template cache updates to re-render when templates finish loading
    useEffect(() => {
        return templateCache.subscribe(() => setTemplateVersion(v => v + 1))
    }, [])

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
        const { line1: guestNameLine1, line2: guestNameLine2, line3: guestNameLine3 } = formatGuestNameLines(parsedNames)

        // Guest name sizing: use smaller font when 3 lines are needed (4+ guests)
        const guestNameLineCount = [guestNameLine1, guestNameLine2, guestNameLine3].filter(l => l.length > 0).length
        let guestNameFontSize, guestNameLineSpacing, guestNameStartY
        if (guestNameLineCount <= 2) {
            guestNameFontSize = 85
            guestNameLineSpacing = 100
            guestNameStartY = 890
        } else {
            guestNameFontSize = 60
            guestNameLineSpacing = 70
            guestNameStartY = 870
        }

        // Calculate Y positions based on whether guest names are present
        // Without guest names: topic can be lower on the canvas (more centered)
        // With guest names: shift pill and topic up to make room for names at bottom
        let pillY, pillText1Y, pillText2Y, topicLine1Y, topicLine2Y, topicLine3Y, topicLine4Y

        // Font size heuristic based on topic length
        // Short/medium topics (≤45 chars): 120px, fits in up to 3 lines at 15 chars/line
        // Longer topics (≤72 chars): 100px, fits in up to 4 lines at 18 chars/line  
        // Very long topics (>72 chars): 85px, fits in 4 lines at ~21 chars/line
        let topicFontSize, charsPerLine, lineSpacing
        const topicLen = (topic || '').length

        if (topicLen <= 45) {
            topicFontSize = 120
            charsPerLine = 15
            lineSpacing = 135
        } else if (topicLen <= 72) {
            topicFontSize = 100
            charsPerLine = 18
            lineSpacing = 115
        } else {
            topicFontSize = 85
            charsPerLine = 21
            lineSpacing = 100
        }

        pillY = 50
        pillText1Y = 115
        pillText2Y = 165

        // Wrap topic text into lines using calculated chars per line
        const topicLines = wrapTopicText(topic, charsPerLine, 4)

        // Count actual non-empty lines for vertical centering
        const usedLines = topicLines.filter(l => l.length > 0).length || 1

        // Vertical centering: position the topic text block in the available area
        // Available area is roughly from y=260 (below pill) to above guest names area
        // or to y=1020 if no guest names
        const areaTop = 260
        const areaBottom = hasGuestNames ? (guestNameStartY - 40) : 1020
        const totalTextHeight = (usedLines - 1) * lineSpacing
        // Text y is baseline, so offset by ~0.7 * fontSize to center the visual block
        const blockTop = (areaTop + areaBottom - totalTextHeight) / 2
        topicLine1Y = Math.round(blockTop)
        topicLine2Y = topicLine1Y + lineSpacing
        topicLine3Y = topicLine2Y + lineSpacing
        topicLine4Y = topicLine3Y + lineSpacing

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
            TOPIC_LINE_4_Y: topicLine4Y,
            TOPIC_FONT_SIZE: topicFontSize,
            // Content tokens
            PILL_LINE_1: escapeXml(pillLine1),
            PILL_LINE_2: escapeXml(pillLine2),
            TOPIC_LINE_1: escapeXml(topicLines[0] || ''),
            TOPIC_LINE_2: escapeXml(topicLines[1] || ''),
            TOPIC_LINE_3: escapeXml(topicLines[2] || ''),
            TOPIC_LINE_4: escapeXml(topicLines[3] || ''),
            GUEST_1: getGuestImage(0),
            GUEST_2: getGuestImage(1),
            GUEST_3: getGuestImage(2),
            GUEST_4: getGuestImage(3),
            GUEST_NAME_LINE_1: escapeXml(guestNameLine1),
            GUEST_NAME_LINE_2: escapeXml(guestNameLine2),
            GUEST_NAME_LINE_3: escapeXml(guestNameLine3),
            GUEST_NAME_FONT_SIZE: guestNameFontSize,
            GUEST_NAME_LINE_1_Y: guestNameStartY,
            GUEST_NAME_LINE_2_Y: guestNameLineCount >= 2 ? guestNameStartY + guestNameLineSpacing : guestNameStartY,
            GUEST_NAME_LINE_3_Y: guestNameLineCount >= 3 ? guestNameStartY + guestNameLineSpacing * 2 : guestNameStartY,
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
