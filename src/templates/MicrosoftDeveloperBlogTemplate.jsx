import { useCallback, useRef } from 'react'
import { escapeXml, escapeXmlPreservingSpaces, wrapTextToWidth, parseResolution, generateUniqueId, getTextMeasureContext } from '../utils/svgUtils'
import { DEVCOM_ART } from './devcomArt'

// Layout constants, expressed against the 1920x1080 design grid and scaled.
const MARGIN_X_BASE = 96
const MARGIN_Y_BASE = 90
const TITLE_Y_BASE = 430

// The right third is reserved for artwork; text never crosses TEXT_RIGHT_RATIO.
const ART_BAND_X_RATIO = 0.635
const ART_BAND_RIGHT_PAD_BASE = 56
const TEXT_RIGHT_RATIO = 0.6

// Uploaded-image layouts match the .NET Blog template.
const CIRCLE_CENTER_X_RATIO = 0.878
const CIRCLE_CENTER_Y_RATIO = 0.628
const CIRCLE_RADIUS_RATIO = 0.256
const SPLIT_CLIP_TOP_X_BASE = 1345
const SPLIT_CLIP_BOTTOM_X_BASE = 1090
const OVERLAY_RECT_X_BASE = 1239
const OVERLAY_RECT_Y_BASE = 110
const OVERLAY_RECT_WIDTH_BASE = 950
const OVERLAY_RECT_HEIGHT_BASE = 861
const ARTWORK_X_BASE = 1010
const ARTWORK_Y_BASE = 55
const ARTWORK_WIDTH_BASE = 855
const ARTWORK_HEIGHT_BASE = 970

// developer.microsoft.com palette
const PALETTE = {
    midnight: '#001632',
    navy: '#001F3B',
    violet: '#6631C2',
    lavender: '#A89FD9',
    lilac: '#D7C8EF',
    grey: '#DBDBDB',
    paper: '#F4F4F4',
}

const SCRIM_OPACITY = { off: 0, subtle: 0.45, strong: 0.78 }

/**
 * Shorten a line that already fits `maxWidth` down to a version ending in an
 * ellipsis, used when a block is truncated to a maximum line count. Falls
 * back to a plain character trim when no measurement context is available
 * (the line already fit without the ellipsis, so dropping one character
 * keeps it within bounds).
 */
function truncateLineWithEllipsis(line, maxWidth, ctx) {
    const ellipsis = '\u2026'
    if (!line) return ellipsis

    if (!ctx) {
        return `${line.slice(0, -1).trimEnd()}${ellipsis}`
    }

    let truncated = line
    while (truncated.length > 1 && ctx.measureText(`${truncated}${ellipsis}`).width > maxWidth) {
        truncated = truncated.slice(0, -1)
    }
    return `${truncated.trimEnd()}${ellipsis}`
}

/**
 * Microsoft Developer Blog Template
 *
 * Featured images for https://developer.microsoft.com/blog/ — a title/subtitle
 * column on the left two thirds, developer.microsoft.com artwork on the right
 * third, over the brand gradient backgrounds in light or dark themes.
 *
 * Right-hand content precedence: uploaded layout image > logos > bundled artwork.
 */
export function MicrosoftDeveloperBlogTemplate({
    values,
    selectedBackground,
    variant,
    resolution,
}) {
    const textCtxRef = useRef(getTextMeasureContext())
    const textCtx = textCtxRef.current

    const {
        title = '',
        subtitle = '',
        pill = '',
        logos = [],
        art = 'cubes',
        imageLayout = 'none',
        layoutImage = null,
        scrim = 'subtle',
    } = values

    const generateSvg = useCallback(() => {
        const [width, height] = parseResolution(resolution)
        const bgUrl = selectedBackground?.url || ''

        const fontFamily = "'Segoe UI', system-ui, -apple-system, sans-serif"
        const scale = width / 1920
        const isDark = variant === 'dark'

        const edgeMarginX = MARGIN_X_BASE * scale
        const edgeMarginY = MARGIN_Y_BASE * scale

        // Theme colors
        const titleColor = isDark ? PALETTE.paper : PALETTE.midnight
        const subtitleColor = isDark ? PALETTE.lilac : PALETTE.navy
        const pillBgColor = isDark ? PALETTE.lilac : PALETTE.violet
        const pillTextColor = isDark ? PALETTE.midnight : PALETTE.paper
        const scrimColor = isDark ? PALETTE.midnight : PALETTE.paper

        // Right-hand content: an uploaded image wins, then logos, then bundled art.
        const hasLayoutImage = imageLayout !== 'none' && Boolean(layoutImage)
        const hasLogos = !hasLayoutImage && logos.length > 0
        const artUrl = !hasLayoutImage && !hasLogos && art !== 'none' ? DEVCOM_ART[art] : null
        // Pill
        const pillHeight = 112 * scale
        const pillRadius = pillHeight / 2
        const pillFontSize = 58 * scale
        const pillX = edgeMarginX
        const pillY = edgeMarginY
        const pillPaddingX = 44 * scale
        const pillFont = `600 ${pillFontSize}px ${fontFamily}`
        if (textCtx) textCtx.font = pillFont
        const pillTextWidth = pill
            ? (textCtx ? textCtx.measureText(pill).width : pill.length * pillFontSize * 0.6)
            : 0
        const pillWidth = pill ? pillTextWidth + (pillPaddingX * 2) : 0

        // Text column
        const titleX = edgeMarginX
        const titleY = TITLE_Y_BASE * scale
        // Keep this boundary invariant: full-bleed backgrounds can carry their own
        // artwork on the right even when the optional bundled art is disabled.
        const textRightBoundary = hasLayoutImage
            ? width / 2
            : width * TEXT_RIGHT_RATIO
        const textMaxWidth = Math.max(0, textRightBoundary - titleX)

        // Subtitle is bottom-anchored so the block grows upward. Unbounded
        // explicit line breaks (or very long text) could otherwise push the
        // title's bottom limit above its own starting point, so the subtitle
        // block itself is capped to a share of the available text band and
        // any remainder is truncated with an ellipsis.
        const subtitleFontSize = 64 * scale
        const subtitleLineHeight = subtitleFontSize * 1.15
        const subtitleFont = `600 ${subtitleFontSize}px ${fontFamily}`
        const textBandHeight = Math.max(0, (height - edgeMarginY) - titleY)
        let subtitleLines = subtitle ? wrapTextToWidth(subtitle, textMaxWidth, textCtx, subtitleFont) : []
        const maxSubtitleLines = subtitle
            ? Math.max(1, Math.floor((textBandHeight * 0.4) / subtitleLineHeight) + 1)
            : 0
        if (subtitleLines.length > maxSubtitleLines) {
            subtitleLines = subtitleLines.slice(0, maxSubtitleLines)
            const lastIndex = subtitleLines.length - 1
            subtitleLines[lastIndex] = truncateLineWithEllipsis(subtitleLines[lastIndex], textMaxWidth, textCtx)
        }
        const subtitleBottomBaselineY = height - edgeMarginY
        const subtitleY = subtitleBottomBaselineY - Math.max(0, (subtitleLines.length - 1) * subtitleLineHeight)

        // Auto-shrink the title until it clears the subtitle block. The
        // bottom limit is clamped so it never rises above the title's own
        // start, keeping the shrink loop well-defined even for an oversized
        // subtitle block.
        const titleMaxFontSize = 126 * scale
        const titleMinFontSize = 64 * scale
        const titleBottomLimit = subtitle
            ? Math.max(titleY, subtitleY - subtitleFontSize - (28 * scale))
            : height - edgeMarginY
        let titleFontSize = titleMaxFontSize
        let titleLineHeight = titleFontSize * 1.1
        let titleFont = `700 ${titleFontSize}px ${fontFamily}`
        let titleLines = wrapTextToWidth(title, textMaxWidth, textCtx, titleFont)

        while (
            title &&
            titleFontSize > titleMinFontSize &&
            titleY + (titleLines.length - 1) * titleLineHeight > titleBottomLimit
        ) {
            titleFontSize -= 4 * scale
            titleLineHeight = titleFontSize * 1.1
            titleFont = `700 ${titleFontSize}px ${fontFamily}`
            titleLines = wrapTextToWidth(title, textMaxWidth, textCtx, titleFont)
        }

        // Even at the minimum font size, an extreme number of explicit line
        // breaks could still overflow into the subtitle. Cap the rendered
        // line count to what fits and mark the cut with an ellipsis so the
        // two blocks never overlap.
        const maxTitleLines = Math.max(1, Math.floor((titleBottomLimit - titleY) / titleLineHeight) + 1)
        if (titleLines.length > maxTitleLines) {
            titleLines = titleLines.slice(0, maxTitleLines)
            const lastIndex = titleLines.length - 1
            titleLines[lastIndex] = truncateLineWithEllipsis(titleLines[lastIndex], textMaxWidth, textCtx)
        }

        // Artwork band (right third)
        const bandX = width * ART_BAND_X_RATIO
        const bandWidth = Math.max(0, width - bandX - (ART_BAND_RIGHT_PAD_BASE * scale))
        const bandY = edgeMarginY
        const bandHeight = Math.max(0, height - (edgeMarginY * 2))

        // Logo stack, mirroring the .NET blog template's vertical column
        const logoCount = logos.length
        const logoGap = (logoCount === 3 ? 18 : 24) * scale
        const logoCenterX = bandX + (bandWidth / 2)
        let logoCircleRadius = 190 * scale
        let logoSpacing = 0
        let logoStartY = height * 0.5
        let logoStaggerX = 0
        let logoBaseX = logoCenterX

        if (logoCount > 1) {
            const fitRadius = (bandHeight - ((logoCount - 1) * logoGap)) / (2 * logoCount)
            logoCircleRadius = Math.min(190 * scale, fitRadius, bandWidth / 2)
            logoSpacing = (logoCircleRadius * 2) + logoGap
            const stackHeight = (logoCount * 2 * logoCircleRadius) + ((logoCount - 1) * logoGap)
            logoStartY = Math.max(bandY, (height - stackHeight) / 2) + logoCircleRadius
            if (logoCount === 3) logoStaggerX = logoCircleRadius * 0.55
            logoBaseX = logoCenterX - (logoStaggerX / 2)
        } else {
            logoCircleRadius = Math.min(190 * scale, bandWidth / 2)
        }

        const scrimOpacity = SCRIM_OPACITY[scrim] ?? SCRIM_OPACITY.subtle
        const uniqueId = generateUniqueId()

        const renderArtwork = () => {
            if (artUrl) {
                if (art === 'ribbon') {
                    return `<image href="${artUrl}" x="${width * 2 / 3}" y="0" width="${width / 3}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
                }

                return `<image href="${artUrl}" x="${bandX}" y="${bandY}" width="${bandWidth}" height="${bandHeight}" preserveAspectRatio="xMidYMid meet"/>`
            }

            if (!hasLayoutImage) return ''
            const imgUrl = layoutImage.dataUrl

            if (imageLayout === 'artwork') {
                return `<image href="${imgUrl}" x="${ARTWORK_X_BASE * scale}" y="${ARTWORK_Y_BASE * scale}" width="${ARTWORK_WIDTH_BASE * scale}" height="${ARTWORK_HEIGHT_BASE * scale}" preserveAspectRatio="xMidYMid meet"/>`
            }

            if (imageLayout === 'circle') {
                const cx = width * CIRCLE_CENTER_X_RATIO
                const cy = height * CIRCLE_CENTER_Y_RATIO
                const r = width * CIRCLE_RADIUS_RATIO
                return `
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${PALETTE.paper}" filter="url(#${uniqueId}-image-shadow)"/>
          <image href="${imgUrl}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#${uniqueId}-circle-clip)" preserveAspectRatio="xMidYMid slice"/>
        `
            }

            if (imageLayout === 'split') {
                const splitBottomX = SPLIT_CLIP_BOTTOM_X_BASE * scale
                return `<image href="${imgUrl}" x="${splitBottomX}" y="0" width="${width - splitBottomX}" height="${height}" clip-path="url(#${uniqueId}-split-clip)" preserveAspectRatio="xMidYMid slice"/>`
            }

            if (imageLayout === 'overlay') {
                const rectX = OVERLAY_RECT_X_BASE * scale
                const rectY = OVERLAY_RECT_Y_BASE * scale
                const rectWidth = OVERLAY_RECT_WIDTH_BASE * scale
                const rectHeight = OVERLAY_RECT_HEIGHT_BASE * scale
                return `
          <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" rx="${24 * scale}" fill="${PALETTE.paper}" filter="url(#${uniqueId}-image-shadow)"/>
          <image href="${imgUrl}" x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" clip-path="url(#${uniqueId}-overlay-clip)" preserveAspectRatio="xMidYMid slice"/>
        `
            }

            return ''
        }

        return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="${isDark ? PALETTE.midnight : PALETTE.paper}"/>
        ${selectedBackground
                ? `<image href="${bgUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
                : ''}

        <!-- Artwork -->
        ${renderArtwork()}

        <!-- Logos in white circles -->
        ${hasLogos ? logos.map((logo, i) => {
                    const y = logoCount > 1 ? (logoStartY + i * logoSpacing) : (height * 0.5)
                    const x = logoCount === 3 && i === 1 ? (logoBaseX + logoStaggerX) : logoBaseX
                    const logoUrl = logo.isUploaded ? logo.dataUrl : logo.url
                    const logoClipRadius = logoCircleRadius * 0.9
                    const logoSize = logoClipRadius * Math.SQRT2 * 0.98
                    return `
            <g transform="translate(${x}, ${y})">
              <circle cx="0" cy="0" r="${logoCircleRadius}" fill="${PALETTE.paper}"/>
              <clipPath id="${uniqueId}-logo-clip-${i}">
                <circle cx="0" cy="0" r="${logoClipRadius}"/>
              </clipPath>
              <image href="${logoUrl}" x="${-logoSize / 2}" y="${-logoSize / 2}" width="${logoSize}" height="${logoSize}" clip-path="url(#${uniqueId}-logo-clip-${i})" preserveAspectRatio="xMidYMid meet"/>
            </g>
          `
                }).join('') : ''}

        <!-- Legibility scrim behind the text column -->
        ${scrimOpacity > 0 ? `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${uniqueId}-scrim)"/>` : ''}

        <!-- Pill/Badge -->
        ${pill ? `
          <g>
            <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${pillRadius}" fill="${pillBgColor}"/>
            <text x="${pillX + pillWidth / 2}" y="${pillY + pillHeight / 2 + pillFontSize * 0.35}" font-family="${fontFamily}" font-size="${pillFontSize}" font-weight="600" fill="${pillTextColor}" text-anchor="middle">${escapeXml(pill)}</text>
          </g>
        ` : ''}

        <!-- Title -->
        ${title ? `
          <text x="${titleX}" y="${titleY}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="700" fill="${titleColor}" style="line-height:1.1" clip-path="url(#${uniqueId}-text-clip)">
            ${titleLines.map((line, i) =>
                    `<tspan x="${titleX}" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXmlPreservingSpaces(line)}</tspan>`
                ).join('')}
          </text>
        ` : ''}

        <!-- Subtitle -->
        ${subtitle ? `
          <text x="${titleX}" y="${subtitleY}" font-family="${fontFamily}" font-size="${subtitleFontSize}" font-weight="600" fill="${subtitleColor}" style="line-height:1.15" clip-path="url(#${uniqueId}-text-clip)">
            ${subtitleLines.map((line, i) =>
                    `<tspan x="${titleX}" dy="${i === 0 ? 0 : subtitleLineHeight}">${escapeXmlPreservingSpaces(line)}</tspan>`
                ).join('')}
          </text>
        ` : ''}

        <!-- Filters, gradients and clip paths -->
        <defs>
          <clipPath id="${uniqueId}-text-clip">
            <rect x="${titleX}" y="0" width="${textMaxWidth}" height="${height}"/>
          </clipPath>
          ${scrimOpacity > 0 ? `
            <linearGradient id="${uniqueId}-scrim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0" stop-color="${scrimColor}" stop-opacity="${scrimOpacity}"/>
              <stop offset="0.45" stop-color="${scrimColor}" stop-opacity="${(scrimOpacity * 0.55).toFixed(3)}"/>
              <stop offset="0.72" stop-color="${scrimColor}" stop-opacity="0"/>
            </linearGradient>
          ` : ''}
          <filter id="${uniqueId}-image-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="-6" dy="-6" stdDeviation="25" flood-opacity="0.3"/>
          </filter>
          ${hasLayoutImage && imageLayout === 'circle' ? `
            <clipPath id="${uniqueId}-circle-clip">
              <circle cx="${width * CIRCLE_CENTER_X_RATIO}" cy="${height * CIRCLE_CENTER_Y_RATIO}" r="${width * CIRCLE_RADIUS_RATIO}"/>
            </clipPath>
          ` : ''}
          ${hasLayoutImage && imageLayout === 'split' ? `
            <clipPath id="${uniqueId}-split-clip">
              <path d="M ${SPLIT_CLIP_TOP_X_BASE * scale},0 L ${SPLIT_CLIP_BOTTOM_X_BASE * scale},${height} L ${width},${height} L ${width},0 Z"/>
            </clipPath>
          ` : ''}
          ${hasLayoutImage && imageLayout === 'overlay' ? `
            <clipPath id="${uniqueId}-overlay-clip">
              <rect x="${OVERLAY_RECT_X_BASE * scale}" y="${OVERLAY_RECT_Y_BASE * scale}" width="${OVERLAY_RECT_WIDTH_BASE * scale}" height="${OVERLAY_RECT_HEIGHT_BASE * scale}" rx="${24 * scale}"/>
            </clipPath>
          ` : ''}
        </defs>
      </svg>
    `
    }, [resolution, selectedBackground, title, subtitle, pill, logos, variant, art, imageLayout, layoutImage, scrim, textCtx])

    return { generateSvg }
}

export default MicrosoftDeveloperBlogTemplate
