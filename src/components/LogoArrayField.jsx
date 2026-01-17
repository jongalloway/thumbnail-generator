import { useRef, useCallback } from 'react'

/**
 * Logo selector component with preset logos and custom upload
 */
export function LogoArrayField({
    label,
    value = [],
    onChange,
    maxItems = 3,
    availableLogos = [],
    helperText,
    showToast,
}) {
    const fileInputRef = useRef(null)

    const toggleLogo = useCallback((logo) => {
        const isSelected = value.some(l => l.id === logo.id)
        if (isSelected) {
            onChange(value.filter(l => l.id !== logo.id))
        } else {
            if (value.length >= maxItems) {
                showToast?.(`Maximum ${maxItems} logos allowed`, 'error')
                return
            }
            onChange([...value, logo])
        }
    }, [value, maxItems, onChange, showToast])

    const removeLogo = useCallback((logoId) => {
        onChange(value.filter(l => l.id !== logoId))
    }, [value, onChange])

    const handleFileUpload = useCallback((event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (value.length >= maxItems) {
            showToast?.(`Maximum ${maxItems} logos allowed`, 'error')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const newLogo = {
                id: `uploaded-${Date.now()}`,
                name: file.name,
                dataUrl: e.target.result,
                isUploaded: true,
            }
            onChange([...value, newLogo])
        }
        reader.readAsDataURL(file)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [value, maxItems, onChange, showToast])

    return (
        <div className="control-group">
            <label>{label}</label>
            {helperText && <small className="helper-text">{helperText}</small>}

            <div className="logo-selector" style={{ marginTop: 'var(--spacing-sm)' }}>
                {/* Available logos */}
                <div className="logo-options" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-md)',
                }}>
                    {availableLogos.map(logo => (
                        <button
                            key={logo.id}
                            type="button"
                            className={`logo-option ${value.some(l => l.id === logo.id) ? 'selected' : ''}`}
                            onClick={() => toggleLogo(logo)}
                            aria-pressed={value.some(l => l.id === logo.id)}
                            aria-label={`${logo.name} logo`}
                        >
                            <img src={logo.url} alt={logo.name} />
                        </button>
                    ))}
                </div>

                {/* Selected logos */}
                <div className="selected-logos" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-sm)',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-sm)',
                    minHeight: '48px',
                }}>
                    <span className="label" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Selected:</span>
                    <div className="logo-preview-list" style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        {value.length === 0 ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                None selected (max {maxItems})
                            </span>
                        ) : (
                            value.map(logo => (
                                <div key={logo.id} className="logo-preview-item" style={{
                                    position: 'relative',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'white',
                                    padding: '4px',
                                    boxShadow: 'var(--shadow-sm)',
                                }}>
                                    <img
                                        src={logo.isUploaded ? logo.dataUrl : logo.url}
                                        alt={logo.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                    <button
                                        type="button"
                                        className="remove-btn"
                                        onClick={() => removeLogo(logo.id)}
                                        aria-label={`Remove ${logo.name}`}
                                        style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-4px',
                                            background: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '16px',
                                            height: '16px',
                                            cursor: 'pointer',
                                            fontSize: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upload custom logo */}
                <div className="logo-upload" style={{ marginTop: 'var(--spacing-sm)' }}>
                    <div className="upload-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Or upload your own:</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            className="visually-hidden"
                        />
                        <button
                            type="button"
                            className="upload-button"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Choose File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LogoArrayField
