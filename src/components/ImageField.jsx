import { useRef, useCallback } from 'react'

/**
 * Single image upload field
 */
export function ImageField({
    label,
    value,
    onChange,
    helperText,
}) {
    const fileInputRef = useRef(null)

    const handleFileUpload = useCallback((event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            onChange({
                id: `img-${Date.now()}`,
                name: file.name,
                dataUrl: e.target.result,
            })
        }
        reader.readAsDataURL(file)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [onChange])

    return (
        <div className="control-group">
            <label>{label}</label>
            {helperText && <small className="helper-text">{helperText}</small>}

            <div className="image-upload" style={{ marginTop: 'var(--spacing-sm)' }}>
                <div className="upload-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
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

                {value && (
                    <div className="image-preview" style={{
                        marginTop: 'var(--spacing-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)'
                    }}>
                        <img
                            src={value.dataUrl}
                            alt="Uploaded"
                            style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-sm)'
                            }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{value.name}</span>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            aria-label="Remove image"
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ImageField
