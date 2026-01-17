import { getAllTemplates } from '../templates'

/**
 * Template selector dropdown component
 */
export function TemplateSelector({ selectedTemplateId, onTemplateChange }) {
    const templates = getAllTemplates()

    return (
        <div className="control-group template-selector">
            <label htmlFor="template-select">Layout Template</label>
            <select
                id="template-select"
                value={selectedTemplateId}
                onChange={(e) => onTemplateChange(e.target.value)}
                aria-describedby="template-desc"
            >
                {templates.map(template => (
                    <option key={template.id} value={template.id}>
                        {template.name}
                    </option>
                ))}
            </select>
            <small id="template-desc" className="helper-text">
                {templates.find(t => t.id === selectedTemplateId)?.description || 'Select a template layout'}
            </small>
        </div>
    )
}

export default TemplateSelector
