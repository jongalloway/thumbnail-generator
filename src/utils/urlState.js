import { getDefaultValues, getTemplate, getTemplateIds } from '../templates'

const URL_KEYS = {
    templateId: ['template', 'templateId'],
    backgroundId: ['background', 'backgroundId'],
    resolution: ['resolution'],
    exportFormat: ['format', 'exportFormat'],
}

function firstParam(params, keys) {
    return keys.map(key => params.get(key)).find(value => value !== null)
}

function getFieldValue(params, fieldId) {
    return params.get(fieldId) ?? params.get(`field.${fieldId}`)
}

// Split a comma-separated list of logo ids from the querystring into the matching
// logo objects from the set of logos discovered on disk (uploaded logos aren't shareable).
function parseLogoIds(rawValue, availableLogos) {
    if (!rawValue) return []
    const ids = rawValue.split(',').map(id => id.trim()).filter(Boolean)
    return ids
        .map(id => availableLogos.find(logo => logo.id === id))
        .filter(Boolean)
}

function getValidFieldValues(params, templateId, availableLogos = []) {
    const template = getTemplate(templateId)
    if (!template) return {}

    return template.fields.reduce((values, field) => {
        const value = getFieldValue(params, field.id)
        if (value === null || field.type === 'image' || field.type === 'image_array') {
            return values
        }

        if (field.type === 'logo_array') {
            const logos = parseLogoIds(value, availableLogos)
            if (logos.length > 0) {
                values[field.id] = field.maxItems ? logos.slice(0, field.maxItems) : logos
            }
            return values
        }

        if (field.type === 'select' && !field.options?.some(option => option.value === value)) {
            return values
        }

        values[field.id] = value
        return values
    }, {})
}

// Field types that can't be represented as a simple querystring value (arbitrary uploaded images).
const NON_SERIALIZABLE_FIELD_TYPES = ['image', 'image_array']

/**
 * Build a shareable querystring from the current app state. Only plain, serializable
 * values (text/select fields, preset logos, background, resolution, export format) are
 * included; uploaded image-based fields are skipped since they can't survive as URL parameters.
 */
export function buildShareParams({ templateId, backgroundId, resolution, exportFormat, fieldValues = {} }) {
    const params = new URLSearchParams()

    if (templateId) {
        params.set(URL_KEYS.templateId[0], templateId)
    }
    if (backgroundId) {
        params.set(URL_KEYS.backgroundId[0], backgroundId)
    }
    if (resolution) {
        params.set(URL_KEYS.resolution[0], resolution)
    }
    if (exportFormat) {
        params.set(URL_KEYS.exportFormat[0], exportFormat)
    }

    const template = getTemplate(templateId)
    template?.fields.forEach(field => {
        if (NON_SERIALIZABLE_FIELD_TYPES.includes(field.type)) return

        const value = fieldValues[field.id]

        if (field.type === 'logo_array') {
            const presetIds = (value || [])
                .filter(logo => !logo.isUploaded)
                .map(logo => logo.id)
            if (presetIds.length > 0) {
                params.set(field.id, presetIds.join(','))
            }
            return
        }

        if (value === undefined || value === null || value === '') return
        params.set(field.id, value)
    })

    return params
}

/**
 * Build a full shareable URL (current origin + path + querystring) from app state.
 */
export function buildShareUrl(state, baseUrl = window.location.href) {
    const url = new URL(baseUrl)
    url.search = buildShareParams(state).toString()
    return url.toString()
}

export function parseUrlState(search = '', availableLogos = []) {
    const params = new URLSearchParams(search)
    const requestedTemplateId = firstParam(params, URL_KEYS.templateId)
    const templateId = getTemplateIds().includes(requestedTemplateId)
        ? requestedTemplateId
        : getTemplateIds()[0]
    const template = getTemplate(templateId)
    const providedFields = template?.fields
        .filter(field => params.has(field.id) || params.has(`field.${field.id}`))
        .map(field => field.id) || []
    const requestedResolution = firstParam(params, URL_KEYS.resolution)
    const requestedExportFormat = firstParam(params, URL_KEYS.exportFormat)

    return {
        templateId,
        hasTemplate: URL_KEYS.templateId.some(key => params.has(key)),
        hasFieldValues: providedFields.length > 0,
        providedFields,
        backgroundId: firstParam(params, URL_KEYS.backgroundId),
        resolution: ['1200x630', '1920x1080', '1280x720'].includes(requestedResolution)
            ? requestedResolution
            : null,
        exportFormat: ['jpg', 'png', 'webp'].includes(requestedExportFormat?.toLowerCase())
            ? requestedExportFormat.toLowerCase()
            : null,
        fieldValues: {
            ...getDefaultValues(templateId),
            ...getValidFieldValues(params, templateId, availableLogos),
        },
    }
}
