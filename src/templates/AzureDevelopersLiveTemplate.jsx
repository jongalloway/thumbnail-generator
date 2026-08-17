import { useCallback, useEffect, useRef, useState } from 'react'
import { escapeXml, getTextMeasureContext, parseResolution, wrapTextToWidth } from '../utils/svgUtils'
import { replaceTokens } from '../utils/svgTemplateProcessor'
import { wrapSpeakerNames } from '../utils/speakerNameLines'

const TEMPLATE_PATHS = {
    2: '/thumbnail-generator/templates/azure-developers-live/two-speakers.svg',
    3: '/thumbnail-generator/templates/azure-developers-live/three-speakers.svg',
}

const templateCache = {
    templates: {},
    loading: {},
    subscribers: new Set(),
    get(speakerCount) {
        return this.templates[speakerCount] || null
    },
    subscribe(callback) {
        this.subscribers.add(callback)
        return () => this.subscribers.delete(callback)
    },
    notify() {
        this.subscribers.forEach(callback => callback())
    },
    load(speakerCount) {
        if (this.templates[speakerCount] || this.loading[speakerCount]) return

        this.loading[speakerCount] = true
        fetch(TEMPLATE_PATHS[speakerCount] || TEMPLATE_PATHS[2])
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load: ${response.statusText}`)
                return response.text()
            })
            .then(content => {
                this.templates[speakerCount] = content
                this.loading[speakerCount] = false
                this.notify()
            })
            .catch(error => {
                console.error(`Failed to load Azure Developers Live template for ${speakerCount} speakers:`, error)
                this.loading[speakerCount] = false
            })
    },
}

Object.keys(TEMPLATE_PATHS).forEach(count => templateCache.load(Number(count)))

export function AzureDevelopersLiveTemplate({ values, resolution }) {
    const templateRef = useRef(null)
    const [, setTemplateVersion] = useState(0)
    const { topic = '', speakers = [], speakerNames = '' } = values
    const speakerCount = Math.max(2, Math.min(3, speakers.length || 2))

    useEffect(() => templateCache.subscribe(() => setTemplateVersion(version => version + 1)), [])

    templateRef.current = templateCache.get(speakerCount)
    if (!templateRef.current && !templateCache.loading[speakerCount]) templateCache.load(speakerCount)

    const generateSvg = useCallback(() => {
        const [width, height] = parseResolution(resolution)
        const templateContent = templateRef.current
        if (!templateContent) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#06162d"/></svg>`
        }

        const context = getTextMeasureContext()
        const topicLines = wrapTextToWidth(topic.trim(), 1010, context, '700 140px "Segoe UI"').slice(0, 3)
        while (topicLines.length < 3) topicLines.push('')
        const names = speakerNames.split(/\s*[,+]\s*/).map(name => name.trim()).filter(Boolean)
        const nameLines = wrapSpeakerNames(names, 1025, context, '700 56px "Segoe UI"').slice(0, 2)
        while (nameLines.length < 2) nameLines.push('')
        const getSpeaker = index => speakers[index]?.dataUrl || speakers[index]?.url || ''
        const tokens = {
            TOPIC_LINE_1: escapeXml(topicLines[0]),
            TOPIC_LINE_2: escapeXml(topicLines[1]),
            TOPIC_LINE_3: escapeXml(topicLines[2]),
            SPEAKER_NAMES_LINE_1: escapeXml(nameLines[0]),
            SPEAKER_NAMES_LINE_2: escapeXml(nameLines[1]),
            SPEAKER_1: getSpeaker(0),
            SPEAKER_2: getSpeaker(1),
            SPEAKER_3: getSpeaker(2),
        }

        let svg = replaceTokens(templateContent, tokens)
        if (width !== 1920 || height !== 1080) {
            svg = svg.replace(/width="1920"/, `width="${width}"`)
            svg = svg.replace(/height="1080"/, `height="${height}"`)
        }
        return svg
    }, [resolution, speakerNames, speakers, topic])

    return { generateSvg }
}

export default AzureDevelopersLiveTemplate