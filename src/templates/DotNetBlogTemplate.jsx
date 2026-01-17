import { useCallback, useRef } from 'react'
import { escapeXml, wrapTextToWidth, parseResolution, generateUniqueId, getTextMeasureContext } from '../utils/svgUtils'

// Image layout constants - derived from example SVG files
const CIRCLE_CENTER_X_RATIO = 0.878
const CIRCLE_CENTER_Y_RATIO = 0.628
const CIRCLE_RADIUS_RATIO = 0.256
const SPLIT_CLIP_TOP_X_BASE = 1345
const SPLIT_CLIP_BOTTOM_X_BASE = 1090
const OVERLAY_RECT_X_BASE = 1239
const OVERLAY_RECT_Y_BASE = 110
const OVERLAY_RECT_WIDTH_BASE = 950
const OVERLAY_RECT_HEIGHT_BASE = 861

/**
 * .NET Blog Template
 * Renders blog post thumbnails with title, subtitle, pill badge, and logos
 */
export function DotNetBlogTemplate({
    values,
    selectedBackground,
    variant,
    resolution,
}) {
    const textCtxRef = useRef(getTextMeasureContext())
    const textCtx = textCtxRef.current

    const { title = '', subtitle = '', pill = '', logos = [], imageLayout = 'none', layoutImage = null } = values

    const generateSvg = useCallback(() => {
        const [width, height] = parseResolution(resolution)
        const bgUrl = selectedBackground?.url || ''

        const fontFamily = "'Segoe UI', system-ui, -apple-system, sans-serif"
        const scale = width / 1920

        // Margins
        const edgeMarginX = 75 * scale
        const edgeMarginY = 132 * scale

        // Pill dimensions
        const pillHeight = 126 * scale
        const pillRadius = pillHeight / 2
        const pillFontSize = 88 * scale
        const pillX = edgeMarginX
        const pillY = edgeMarginY
        const pillPaddingX = 44 * scale
        const pillFont = `600 ${pillFontSize}px ${fontFamily}`
        if (textCtx) textCtx.font = pillFont
        const pillTextWidth = (() => {
            if (!pill) return 0
            if (textCtx) {
                return textCtx.measureText(pill).width
            }
            return pill.length * pillFontSize * 0.6
        })()
        const pillWidth = pill ? pillTextWidth + (pillPaddingX * 2) : 0

        // Title dimensions
        const titleFontSize = 133 * scale
        const titleLineHeight = titleFontSize * 1.1
        const titleX = 73 * scale
        const titleY = 444 * scale
        const titleFont = `700 ${titleFontSize}px ${fontFamily}`

        // Subtitle dimensions
        const subtitleFontSize = 75 * scale
        const subtitleLineHeight = subtitleFontSize * 1.1
        const subtitleFont = `700 ${subtitleFontSize}px ${fontFamily}`

        // Text color based on variant
        const textColor = variant === 'dark' ? '#ffffff' : '#0f0f0f'
        const pillBgColor = variant === 'dark' ? '#8dc8e8' : '#5946da'

        // Logos
        const logoCount = logos.length
        const desiredLogoCenterX = width - (376 * scale)
        const logoRightMargin = 55 * scale
        const logoEdgeMarginY = 55 * scale
        const logoGap = (logoCount === 3 ? 18 : 24) * scale

        let logoCircleRadius = 205 * scale
        let logoSpacing = 0
        let logoStartY = height * 0.48
        let logoBaseX = desiredLogoCenterX
        let logoStaggerX = 0

        if (logoCount > 1) {
            const maxStackHeight = Math.max(0, height - (2 * logoEdgeMarginY))
            const fitRadius = (maxStackHeight - ((logoCount - 1) * logoGap)) / (2 * logoCount)
            logoCircleRadius = Math.min(205 * scale, fitRadius)
            logoSpacing = (logoCircleRadius * 2) + logoGap
            const stackHeight = (logoCount * 2 * logoCircleRadius) + ((logoCount - 1) * logoGap)
            const stackTop = Math.max(logoEdgeMarginY, (height - stackHeight) / 2)
            logoStartY = stackTop + logoCircleRadius
            if (logoCount === 3) {
                logoStaggerX = logoCircleRadius * 0.55
            }
            logoBaseX = desiredLogoCenterX - (logoStaggerX / 2)
            const maxBaseX = width - logoRightMargin - logoCircleRadius - logoStaggerX
            logoBaseX = Math.min(logoBaseX, maxBaseX)
        }

        // Text width constraint
        const hasRightSideContent = logos.length > 0 || (imageLayout !== 'none' && layoutImage)
        const textRightBoundary = hasRightSideContent ? (width / 2) : (width - edgeMarginX)
        const textMaxWidth = Math.max(0, textRightBoundary - titleX)

        const titleLines = wrapTextToWidth(title, textMaxWidth, textCtx, titleFont)
        const subtitleLines = wrapTextToWidth(subtitle, textMaxWidth, textCtx, subtitleFont)

        const subtitleBottomBaselineY = height - edgeMarginY
        const subtitleY = subtitleBottomBaselineY - Math.max(0, (subtitleLines.length - 1) * subtitleLineHeight)

        const uniqueId = generateUniqueId()

        return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <!-- Background -->
        ${selectedBackground ? `<image href="${bgUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` : `<rect width="${width}" height="${height}" fill="#1a1a2e"/>`}
        
        <!-- Pill/Badge -->
        ${pill ? `
          <g>
            <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${pillRadius}" fill="${pillBgColor}"/>
            <text x="${pillX + pillWidth / 2}" y="${pillY + pillHeight / 2 + pillFontSize * 0.35}" font-family="${fontFamily}" font-size="${pillFontSize}" font-weight="600" fill="${variant === 'dark' ? '#000000' : '#ffffff'}" text-anchor="middle">${escapeXml(pill)}</text>
          </g>
        ` : ''}
        
        <!-- Title -->
        ${title ? `
          <text x="${titleX}" y="${titleY}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="700" fill="${textColor}" style="line-height:1.1">
            ${titleLines.map((line, i) =>
            `<tspan x="${titleX}" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
        ).join('')}
          </text>
        ` : ''}
        
        <!-- Subtitle -->
        ${subtitle ? `
          <text x="${titleX}" y="${subtitleY}" font-family="${fontFamily}" font-size="${subtitleFontSize}" font-weight="700" fill="${textColor}" style="line-height:1.1">
            ${subtitleLines.map((line, i) =>
            `<tspan x="${titleX}" dy="${i === 0 ? 0 : subtitleLineHeight}">${escapeXml(line)}</tspan>`
        ).join('')}
          </text>
        ` : ''}
        
        <!-- Logos in white circles -->
        ${logos.map((logo, i) => {
            const y = logoCount > 1 ? (logoStartY + i * logoSpacing) : (height * 0.48)
            const x = logoCount === 3 && i === 1 ? (logoBaseX + logoStaggerX) : logoBaseX
            const logoUrl = logo.isUploaded ? logo.dataUrl : logo.url
            const logoClipRadius = logoCircleRadius * 0.9
            const logoSize = logoClipRadius * Math.SQRT2 * 0.98
            return `
            <g transform="translate(${x}, ${y})">
              <circle cx="0" cy="0" r="${logoCircleRadius}" fill="white" filter="url(#${uniqueId}-shadow)"/>
              <clipPath id="${uniqueId}-logo-clip-${i}">
                <circle cx="0" cy="0" r="${logoClipRadius}"/>
              </clipPath>
              <image href="${logoUrl}" x="${-logoSize / 2}" y="${-logoSize / 2}" width="${logoSize}" height="${logoSize}" clip-path="url(#${uniqueId}-logo-clip-${i})" preserveAspectRatio="xMidYMid meet"/>
            </g>
          `
        }).join('')}
        
        <!-- Image Layout -->
        ${(() => {
                if (imageLayout === 'none' || !layoutImage) return ''
                const imgUrl = layoutImage.dataUrl

                if (imageLayout === 'circle') {
                    const circleCenterX = width * CIRCLE_CENTER_X_RATIO
                    const circleCenterY = height * CIRCLE_CENTER_Y_RATIO
                    const circleRadius = width * CIRCLE_RADIUS_RATIO
                    return `
          <circle cx="${circleCenterX}" cy="${circleCenterY}" r="${circleRadius}" fill="white" filter="url(#${uniqueId}-image-shadow)"/>
          <image href="${imgUrl}" x="${circleCenterX - circleRadius}" y="${circleCenterY - circleRadius}" width="${circleRadius * 2}" height="${circleRadius * 2}" clip-path="url(#${uniqueId}-circle-clip)" preserveAspectRatio="xMidYMid slice"/>
        `
                }

                if (imageLayout === 'split') {
                    const splitBottomX = SPLIT_CLIP_BOTTOM_X_BASE * scale
                    return `
          <image href="${imgUrl}" x="${splitBottomX}" y="0" width="${width - splitBottomX}" height="${height}" clip-path="url(#${uniqueId}-split-clip)" preserveAspectRatio="xMidYMid slice"/>
        `
                }

                if (imageLayout === 'overlay') {
                    const rectX = OVERLAY_RECT_X_BASE * scale
                    const rectY = OVERLAY_RECT_Y_BASE * scale
                    const rectWidth = OVERLAY_RECT_WIDTH_BASE * scale
                    const rectHeight = OVERLAY_RECT_HEIGHT_BASE * scale
                    return `
          <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="white" filter="url(#${uniqueId}-image-shadow)"/>
          <image href="${imgUrl}" x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" preserveAspectRatio="xMidYMid slice"/>
        `
                }

                return ''
            })()}
        
        <!-- Filters and clip paths -->
        <defs>
          <filter id="${uniqueId}-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="8" flood-opacity="0.15"/>
          </filter>
          <filter id="${uniqueId}-image-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="-6" dy="-6" stdDeviation="25" flood-opacity="0.3"/>
          </filter>
          ${imageLayout === 'circle' && layoutImage ? `
            <clipPath id="${uniqueId}-circle-clip">
              <circle cx="${width * CIRCLE_CENTER_X_RATIO}" cy="${height * CIRCLE_CENTER_Y_RATIO}" r="${width * CIRCLE_RADIUS_RATIO}"/>
            </clipPath>
          ` : ''}
          ${imageLayout === 'split' && layoutImage ? `
            <clipPath id="${uniqueId}-split-clip">
              <path d="M ${SPLIT_CLIP_TOP_X_BASE * scale},0 L ${SPLIT_CLIP_BOTTOM_X_BASE * scale},${height} L ${width},${height} L ${width},0 Z"/>
            </clipPath>
          ` : ''}
        </defs>
      </svg>
    `
    }, [resolution, selectedBackground, title, subtitle, pill, logos, variant, imageLayout, layoutImage, textCtx])

    return { generateSvg }
}

export default DotNetBlogTemplate
