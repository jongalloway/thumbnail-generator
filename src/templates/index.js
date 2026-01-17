/**
 * Template Registry
 * 
 * This file defines all available templates for the thumbnail generator.
 * Each template specifies:
 * - id: Unique identifier
 * - name: Display name in the dropdown
 * - description: Brief description
 * - fields: Array of form fields the template needs
 * - backgrounds: Array of available backgrounds (discovered from public/templates/{id}/)
 * - component: The React component that renders the template
 */

// Field types available for templates
export const FIELD_TYPES = {
    TEXT: 'text',
    TEXTAREA: 'textarea',
    SELECT: 'select',
    IMAGE: 'image',
    IMAGE_ARRAY: 'image_array',
    LOGO: 'logo',
    LOGO_ARRAY: 'logo_array',
}

/**
 * Template definitions
 * Each template defines its own fields and layout
 */
export const TEMPLATES = {
    'dotnet-blog': {
        id: 'dotnet-blog',
        name: '.NET Blog',
        description: 'Blog post thumbnails with title, subtitle, pill badge, and logos',
        // Backgrounds are auto-discovered from public/templates/dotnet-blog/backgrounds/
        fields: [
            {
                id: 'pill',
                type: FIELD_TYPES.TEXT,
                label: 'Pill/Badge (optional)',
                placeholder: 'e.g., Tutorial, Guide',
                maxLength: 30,
            },
            {
                id: 'title',
                type: FIELD_TYPES.TEXT,
                label: 'Title',
                placeholder: 'Enter your title',
                maxLength: 100,
                required: true,
            },
            {
                id: 'subtitle',
                type: FIELD_TYPES.TEXT,
                label: 'Subtitle (optional)',
                placeholder: 'Enter subtitle',
                maxLength: 150,
            },
            {
                id: 'logos',
                type: FIELD_TYPES.LOGO_ARRAY,
                label: 'Logos (optional)',
                maxItems: 3,
                helperText: 'Select up to 3 logos',
            },
            {
                id: 'imageLayout',
                type: FIELD_TYPES.SELECT,
                label: 'Image Layout (optional)',
                options: [
                    { value: 'none', label: 'None' },
                    { value: 'circle', label: 'Circle' },
                    { value: 'split', label: 'Split' },
                    { value: 'overlay', label: 'Overlay' },
                ],
                defaultValue: 'none',
                helperText: 'Note: Selecting an image layout will clear any selected logos',
            },
            {
                id: 'layoutImage',
                type: FIELD_TYPES.IMAGE,
                label: 'Layout Image',
                showWhen: { field: 'imageLayout', notEquals: 'none' },
            },
        ],
        defaultValues: {
            pill: '',
            title: '',
            subtitle: '',
            logos: [],
            imageLayout: 'none',
            layoutImage: null,
        },
    },
    'dotnet-community-standup': {
        id: 'dotnet-community-standup',
        name: '.NET Community Standup',
        description: 'YouTube show thumbnails with episode topic and guest photos',
        // Backgrounds are auto-discovered from public/templates/dotnet-community-standup/backgrounds/
        fields: [
            {
                id: 'pill',
                type: FIELD_TYPES.TEXTAREA,
                label: 'Pill/Badge (2 lines)',
                placeholder: 'e.g., ASP.NET CORE\nCOMMUNITY STANDUP',
                maxLength: 50,
                rows: 2,
                defaultValue: 'ASP.NET CORE\nCOMMUNITY STANDUP',
            },
            {
                id: 'topic',
                type: FIELD_TYPES.TEXT,
                label: 'Episode Topic',
                placeholder: 'e.g., Building AI apps with the new .NET AI template',
                maxLength: 100,
                required: true,
            },
            {
                id: 'guestCount',
                type: FIELD_TYPES.SELECT,
                label: 'Number of Guests',
                options: [
                    { value: '2', label: '2 Guests' },
                    { value: '3', label: '3 Guests' },
                    { value: '4', label: '4 Guests' },
                ],
                defaultValue: '3',
            },
            {
                id: 'guests',
                type: FIELD_TYPES.IMAGE_ARRAY,
                label: 'Guest Photos',
                helperText: 'Upload guest headshot photos (circular crop will be applied)',
                maxItems: 4,
                dynamicMaxItems: { field: 'guestCount' },
            },
        ],
        defaultValues: {
            pill: 'ASP.NET CORE\nCOMMUNITY STANDUP',
            topic: '',
            guestCount: '3',
            guests: [],
        },
    },
}

/**
 * Get a template by ID
 */
export function getTemplate(templateId) {
    return TEMPLATES[templateId] || null
}

/**
 * Get all template IDs
 */
export function getTemplateIds() {
    return Object.keys(TEMPLATES)
}

/**
 * Get all templates as an array
 */
export function getAllTemplates() {
    return Object.values(TEMPLATES)
}

/**
 * Get default field values for a template
 */
export function getDefaultValues(templateId) {
    const template = getTemplate(templateId)
    return template?.defaultValues || {}
}
