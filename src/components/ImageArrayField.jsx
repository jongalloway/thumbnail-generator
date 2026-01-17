import { useRef, useCallback } from 'react'

/**
 * Image upload array component for guest photos etc.
 */
export function ImageArrayField({
    label,
    value = [],
    onChange,
    maxItems = 4,
    helperText
}) {
    const fileInputRef = useRef(null)

    const handleFileUpload = useCallback((event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (value.length >= maxItems) {
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const newImage = {
                id: `img-${Date.now()}`,
                name: file.name,
                dataUrl: e.target.result,
            }
            onChange([...value, newImage])
        }
        reader.readAsDataURL(file)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [value, maxItems, onChange])

    const removeImage = useCallback((id) => {
        onChange(value.filter(img => img.id !== id))
    }, [value, onChange])

    return (
        <div className="control-group">
            <label>{label}</label>
            {helperText && <small className="helper-text" style={{ marginBottom: 'var(--spacing-xs)' }}>{helperText}</small>}

            <div className="image-array-field">
                <div className="image-preview-list" style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--spacing-sm)'
                }}>
                    {value.map((img, i) => (
                        <div key={img.id} className="image-preview-item" style={{
                            position: 'relative',
                            width: '64px',
                            height: '64px',
                        }}>
                            <img
                                src={img.dataUrl}
                                alt={`Image ${i + 1}`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '50%',
                                    border: '2px solid var(--color-border)',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(img.id)}
                                style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
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
                                aria-label={`Remove image ${i + 1}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {/* Add placeholder slots */}
                    {Array.from({ length: maxItems - value.length }).map((_, i) => (
                        <div key={`placeholder-${i}`} style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            border: '2px dashed var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '24px',
                        }}>
                            +
                        </div>
                    ))}
                </div>

                <div className="upload-row">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="visually-hidden"
                        id={`image-array-input-${label}`}
                    />
                    <button
                        type="button"
                        className="upload-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={value.length >= maxItems}
                    >
                        Add Image ({value.length}/{maxItems})
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ImageArrayField
