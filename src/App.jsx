import { useState, useCallback, useMemo, useEffect } from 'react'
import './App.css'

// Template system
import { TEMPLATES, getTemplate, getDefaultValues, getTemplateIds, FIELD_TYPES } from './templates'
import { DotNetBlogTemplate } from './templates/DotNetBlogTemplate'
import { CommunityStandupTemplate } from './templates/CommunityStandupTemplate'

// Components
import { TemplateSelector, ImageArrayField, ImageField, LogoArrayField } from './components'

// Hooks
import { useToast } from './hooks/useToast'
import { useExport } from './hooks/useExport'
import { loadPersistedSettings, persistSetting } from './hooks/usePersistedState'
import { parseResolution } from './utils/svgUtils'

// Auto-discover logos using Vite's import.meta.glob
const logoModules = import.meta.glob('../public/logos/*.{svg,png,jpg,jpeg,gif,webp}', { eager: true, query: '?url', import: 'default' })

const discoveredLogos = Object.entries(logoModules).map(([path, url]) => {
  const filename = path.split('/').pop()
  const name = filename.replace(/\.[^.]+$/, '')
  const displayName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return {
    id: name.toLowerCase(),
    name: displayName,
    file: filename,
    url: url
  }
})

// Auto-discover shared backgrounds
const backgroundModules = import.meta.glob('../public/backgrounds/*.{svg,png,jpg,jpeg,gif,webp}', { eager: true, query: '?url', import: 'default' })

const discoveredBackgrounds = Object.entries(backgroundModules).map(([path, url]) => {
  const filename = path.split('/').pop()
  const name = filename.replace(/\.[^.]+$/, '')
  const displayName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  const variant = name.toLowerCase().includes('light') ? 'light' : 'dark'
  return {
    id: name.toLowerCase(),
    name: displayName,
    file: filename,
    url: url,
    variant: variant
  }
})

// Auto-discover Community Standup backgrounds
const standupBackgroundModules = import.meta.glob('../public/templates/dotnet-community-standup/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })

const standupBackgrounds = Object.entries(standupBackgroundModules).map(([path, url]) => {
  const filename = path.split('/').pop()
  const name = filename.replace(/\.[^.]+$/, '')
  const displayName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return {
    id: name.toLowerCase(),
    name: displayName,
    file: filename,
    url: url,
    variant: 'light' // The standup background appears to be light-themed
  }
})

// Map template IDs to their background sets
const templateBackgrounds = {
  'dotnet-blog': discoveredBackgrounds,
  'dotnet-community-standup': standupBackgrounds.length > 0 ? standupBackgrounds : discoveredBackgrounds,
}

// Template component mapping
const templateComponents = {
  'dotnet-blog': DotNetBlogTemplate,
  'dotnet-community-standup': CommunityStandupTemplate,
}

// Helper to find a background by ID from a backgrounds array
function findBackgroundById(backgrounds, id) {
  return backgrounds.find(bg => bg.id === id) || null
}

function App() {
  // Load persisted settings on init
  const persistedSettings = useMemo(() => loadPersistedSettings(), [])

  // Template selection - restore from localStorage if available
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
    const persisted = persistedSettings.templateId
    if (persisted && getTemplateIds().includes(persisted)) {
      return persisted
    }
    return getTemplateIds()[0]
  })
  const selectedTemplate = getTemplate(selectedTemplateId)

  // Template field values
  const [fieldValues, setFieldValues] = useState(() => getDefaultValues(selectedTemplateId))

  // Background and export settings - restore background from localStorage if available
  const backgrounds = useMemo(() => templateBackgrounds[selectedTemplateId] || discoveredBackgrounds, [selectedTemplateId])
  const [selectedBackground, setSelectedBackground] = useState(() => {
    const persistedBgId = persistedSettings.backgroundId
    const persistedTemplateId = persistedSettings.templateId
    // Only restore background if it's from the same template
    if (persistedBgId && persistedTemplateId === selectedTemplateId) {
      const bgList = templateBackgrounds[selectedTemplateId] || discoveredBackgrounds
      const found = findBackgroundById(bgList, persistedBgId)
      if (found) return found
    }
    return backgrounds[0] || null
  })
  const [variant, setVariant] = useState(selectedBackground?.variant || 'dark')
  const [resolution, setResolution] = useState(() => persistedSettings.resolution || '1920x1080')
  const [exportFormat, setExportFormat] = useState(() => persistedSettings.exportFormat || 'jpg')

  // Persist settings when they change
  useEffect(() => {
    persistSetting('templateId', selectedTemplateId)
  }, [selectedTemplateId])

  useEffect(() => {
    if (selectedBackground) {
      persistSetting('backgroundId', selectedBackground.id)
    }
  }, [selectedBackground])

  useEffect(() => {
    persistSetting('resolution', resolution)
  }, [resolution])

  useEffect(() => {
    persistSetting('exportFormat', exportFormat)
  }, [exportFormat])

  // Toast notifications
  const { toast, showToast } = useToast()

  // Handle template change - update backgrounds
  const handleTemplateChangeWithBackgrounds = useCallback((newTemplateId) => {
    const newBackgrounds = templateBackgrounds[newTemplateId] || discoveredBackgrounds
    // Try to find a previously used background for this template
    const persisted = loadPersistedSettings()
    let newBackground = null
    if (persisted[`backgroundId_${newTemplateId}`]) {
      newBackground = findBackgroundById(newBackgrounds, persisted[`backgroundId_${newTemplateId}`])
    }
    if (!newBackground && newBackgrounds.length > 0) {
      newBackground = newBackgrounds[0]
    }
    if (newBackground) {
      setSelectedBackground(newBackground)
      setVariant(newBackground.variant)
    }
    setSelectedTemplateId(newTemplateId)
    setFieldValues(getDefaultValues(newTemplateId))
  }, [])

  // Also persist per-template background when it changes
  useEffect(() => {
    if (selectedBackground) {
      persistSetting(`backgroundId_${selectedTemplateId}`, selectedBackground.id)
    }
  }, [selectedBackground, selectedTemplateId])

  // The handleTemplateChangeWithBackgrounds callback handles template changes

  // Handle field value change
  const handleFieldChange = useCallback((fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
  }, [])

  // Get the template component and generate SVG
  const TemplateComponent = templateComponents[selectedTemplateId]
  const templateResult = TemplateComponent({
    values: fieldValues,
    selectedBackground,
    variant,
    resolution,
  })
  const generateSvg = templateResult.generateSvg

  // Export functionality
  const { exportRaster, exportSvg } = useExport(generateSvg, resolution, showToast)

  const handleExportRaster = useCallback(() => {
    exportRaster(exportFormat)
  }, [exportRaster, exportFormat])

  const [previewWidth, previewHeight] = parseResolution(resolution)

  // Render field based on type
  const renderField = (field) => {
    const value = fieldValues[field.id]

    // Check showWhen condition
    if (field.showWhen) {
      const conditionValue = fieldValues[field.showWhen.field]
      if (field.showWhen.notEquals && conditionValue === field.showWhen.notEquals) {
        return null
      }
      if (field.showWhen.equals && conditionValue !== field.showWhen.equals) {
        return null
      }
    }

    switch (field.type) {
      case FIELD_TYPES.TEXT:
        return (
          <div key={field.id} className="control-group">
            <label htmlFor={`field-${field.id}`}>{field.label}</label>
            <input
              type="text"
              id={`field-${field.id}`}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
            />
            {field.helperText && <small className="helper-text">{field.helperText}</small>}
          </div>
        )

      case FIELD_TYPES.SELECT:
        return (
          <div key={field.id} className="control-group">
            <label htmlFor={`field-${field.id}`}>{field.label}</label>
            {field.helperText && <small className="helper-text" style={{ marginBottom: 'var(--spacing-xs)' }}>{field.helperText}</small>}
            <select
              id={`field-${field.id}`}
              value={value || field.defaultValue}
              onChange={(e) => {
                handleFieldChange(field.id, e.target.value)
                // Handle mutual exclusivity for image layout
                if (field.id === 'imageLayout' && e.target.value !== 'none') {
                  handleFieldChange('logos', [])
                } else if (field.id === 'imageLayout' && e.target.value === 'none') {
                  handleFieldChange('layoutImage', null)
                }
              }}
            >
              {field.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )

      case FIELD_TYPES.IMAGE:
        return (
          <ImageField
            key={field.id}
            label={field.label}
            value={value}
            onChange={(v) => handleFieldChange(field.id, v)}
            helperText={field.helperText}
          />
        )

      case FIELD_TYPES.IMAGE_ARRAY: {
        const maxItems = field.dynamicMaxItems
          ? parseInt(fieldValues[field.dynamicMaxItems.field], 10) || field.maxItems
          : field.maxItems
        return (
          <ImageArrayField
            key={field.id}
            label={field.label}
            value={value || []}
            onChange={(v) => handleFieldChange(field.id, v)}
            maxItems={maxItems}
            helperText={field.helperText}
          />
        )
      }

      case FIELD_TYPES.LOGO_ARRAY:
        return (
          <LogoArrayField
            key={field.id}
            label={field.label}
            value={value || []}
            onChange={(v) => {
              handleFieldChange(field.id, v)
              // Clear image layout when adding logos
              if (v.length > 0) {
                handleFieldChange('imageLayout', 'none')
                handleFieldChange('layoutImage', null)
              }
            }}
            maxItems={field.maxItems}
            availableLogos={discoveredLogos}
            helperText={field.helperText}
            showToast={showToast}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="container">
      <nav aria-label="Skip links">
        <a className="skip-link" href="#thumbnail-controls">Skip to controls</a>
        <a className="skip-link" href="#thumbnail-preview">Skip to preview</a>
      </nav>

      <header className="header">
        <h1>Thumbnail Generator</h1>
        <p className="subtitle">Create consistent thumbnails for blogs and shows</p>
      </header>

      <main className="editor">
        <section id="thumbnail-controls" className="controls" aria-label="Thumbnail settings">
          {/* Template Selection - at the top */}
          <TemplateSelector
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={handleTemplateChangeWithBackgrounds}
          />

          <hr style={{ margin: 'var(--spacing-md) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Background Selection */}
          <div className="control-group">
            <label htmlFor="background-select">Background</label>
            <select
              id="background-select"
              value={selectedBackground?.id || ''}
              onChange={(e) => {
                const bg = backgrounds.find(b => b.id === e.target.value)
                setSelectedBackground(bg)
                if (bg) setVariant(bg.variant)
              }}
            >
              {backgrounds.map(bg => (
                <option key={bg.id} value={bg.id}>{bg.name}</option>
              ))}
            </select>
          </div>

          {/* Variant Selection - only show for templates that use it */}
          {selectedTemplateId === 'dotnet-blog' && (
            <div className="control-group">
              <label htmlFor="variant-select">Text Variant</label>
              <select
                id="variant-select"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              >
                <option value="dark">Light text (for dark backgrounds)</option>
                <option value="light">Dark text (for light backgrounds)</option>
              </select>
            </div>
          )}

          <hr style={{ margin: 'var(--spacing-md) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Template-specific fields */}
          {selectedTemplate?.fields.map(field => renderField(field))}

          <hr style={{ margin: 'var(--spacing-md) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Resolution Selection */}
          <div className="control-group">
            <label htmlFor="resolution-select">Export Resolution</label>
            <select
              id="resolution-select"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option value="1200x630">1200 × 630 (Social/OG)</option>
              <option value="1920x1080">1920 × 1080 (HD)</option>
              <option value="1280x720">1280 × 720 (720p)</option>
            </select>
          </div>

          {/* Export Format */}
          <div className="control-group">
            <label htmlFor="format-select">Export Format</label>
            <select
              id="format-select"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="export-actions">
            <button type="button" className="btn btn-primary" onClick={handleExportRaster}>
              Export as {(exportFormat || 'jpg').toUpperCase()}
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportSvg}>
              Export as SVG
            </button>
          </div>
        </section>

        {/* Preview Section */}
        <section id="thumbnail-preview" className="preview-section" aria-label="Thumbnail preview">
          <h2 className="visually-hidden">Preview</h2>
          <div className="preview-container">
            <div
              className="preview"
              style={{ '--preview-aspect': `${previewWidth} / ${previewHeight}` }}
              dangerouslySetInnerHTML={{ __html: generateSvg() }}
            />
          </div>

          <aside className="preview-help" aria-label="Instructions">
            <h3 className="preview-help-title">Quick tips</h3>
            <ul className="preview-help-list">
              <li>Select a layout template from the dropdown.</li>
              <li>Choose a background and fill in the template fields.</li>
              <li>Choose an export resolution and format, then export.</li>
            </ul>

            <p className="preview-help-links">
              <a
                className="github-link"
                href="https://github.com/jongalloway/thumbnail-generator"
                target="_blank"
                rel="noreferrer"
              >
                <svg className="github-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                <span className="github-label">More info / file an issue</span>
              </a>
            </p>
          </aside>
        </section>
      </main>

      <footer className="footer">
        <p>
          Thumbnail Generator •{' '}
          <a
            className="github-link"
            href="https://github.com/jongalloway/thumbnail-generator"
            target="_blank"
            rel="noreferrer"
          >
            <svg className="github-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            <span className="github-label">GitHub</span>
          </a>
        </p>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
