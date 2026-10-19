import { useCallback } from 'react'
import { escapeXml, escapeXmlPreservingSpaces, getTextMeasureContext, parseResolution, wrapTextToWidth } from '../utils/svgUtils'

const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

function getTitleLayout(topic, context) {
    let fontSize = 190
    let lines = []

    while (fontSize >= 90) {
        lines = wrapTextToWidth(topic.trim(), 790, context, `700 ${fontSize}px "Segoe UI"`)
        if (lines.length <= 3) break
        fontSize -= 10
    }

    return { fontSize, lines: lines.slice(0, 3) }
}

export function AzureDevelopersOnDemandTemplate({ values, selectedBackground, resolution }) {
    const { topic = '', speakerName = '', speakerPhoto } = values

    const generateSvg = useCallback(() => {
        const [width, height] = parseResolution(resolution)
        const backgroundUrl = selectedBackground?.url || ''
        const speakerPhotoUrl = speakerPhoto?.dataUrl || speakerPhoto?.url || ''
        const context = getTextMeasureContext()
        const { fontSize, lines } = getTitleLayout(topic, context)
        const titleLineHeight = fontSize * 0.97
        let speakerFontSize = 72
        if (speakerName && context) {
            context.font = `700 ${speakerFontSize}px "Segoe UI"`
            while (speakerFontSize > 32 && context.measureText(`with ${speakerName}`).width > 930) {
                speakerFontSize -= 2
                context.font = `700 ${speakerFontSize}px "Segoe UI"`
            }
        }
        const titleText = lines.map((line, index) =>
            `<text x="78" y="${402 + index * titleLineHeight}" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXmlPreservingSpaces(line)}</text>`
        ).join('')

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" preserveAspectRatio="none">
            ${backgroundUrl
                ? `<image href="${escapeXml(backgroundUrl)}" x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" preserveAspectRatio="none"/>`
                : '<rect width="1920" height="1080" fill="#b622bf"/>'}
            <defs>
                <clipPath id="speaker-photo-clip">
                    <circle cx="1545" cy="760" r="455"/>
                </clipPath>
            </defs>
            ${speakerPhotoUrl
                ? `<circle cx="1545" cy="760" r="455" fill="#352b46"/>
                   <image href="${escapeXml(speakerPhotoUrl)}" x="1090" y="305" width="910" height="910" preserveAspectRatio="xMidYMid slice" clip-path="url(#speaker-photo-clip)"/>`
                : ''}
            ${titleText}
            <text x="80" y="1000" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="${speakerFontSize}" font-weight="700">${escapeXml(speakerName ? `with ${speakerName}` : '')}</text>
            ${speakerPhotoUrl ? `
                <g fill="#fff" aria-label="Microsoft logo">
                    <rect x="1744" y="909" width="46" height="46"/>
                    <rect x="1798" y="909" width="46" height="46"/>
                    <rect x="1744" y="963" width="46" height="46"/>
                    <rect x="1798" y="963" width="46" height="46"/>
                </g>
            ` : ''}
        </svg>`
    }, [resolution, selectedBackground, speakerName, speakerPhoto, topic])

    return { generateSvg }
}

export default AzureDevelopersOnDemandTemplate
