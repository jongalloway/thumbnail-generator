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

function getValidFieldValues(params, templateId) {
    const template = getTemplate(templateId)
    if (!template) return {}

    return template.fields.reduce((values, field) => {
        const value = getFieldValue(params, field.id)
        if (value === null || field.type === 'image' || field.type === 'image_array' || field.type === 'logo_array') {
            return values
        }

        if (field.type === 'select' && !field.options?.some(option => option.value === value)) {
            return values
        }

        values[field.id] = value
        return values
    }, {})
}

export function parseUrlState(search = '') {
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
            ...getValidFieldValues(params, templateId),
        },
    }
}
