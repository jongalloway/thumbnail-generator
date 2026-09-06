import { useCallback, useRef } from 'react'

const ACCEPTED_IMAGE_TYPES = 'image/svg+xml,image/png,image/jpeg,image/gif,image/webp,image/avif'
const ACCEPTED_IMAGE_EXTENSIONS = /\.(?:svg|png|jpe?g|gif|webp|avif)$/i

export function BackgroundField({ backgrounds, value, variant, onChange, showToast }) {
    const fileInputRef = useRef(null)

    const handleFileUpload = useCallback((event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/') && !ACCEPTED_IMAGE_EXTENSIONS.test(file.name)) {
            showToast?.('Choose a supported image file.', 'error')
            return
        }

        const reader = new FileReader()
        reader.onload = (loadEvent) => {
            onChange({
                id: `uploaded-background-${Date.now()}`,
                name: file.name,
                file: file.name,
                url: loadEvent.target.result,
                variant,
                isUploaded: true,
            })
        }
        reader.onerror = () => showToast?.('Unable to read the background image.', 'error')
        reader.readAsDataURL(file)

        if (fileInputRef.current) fileInputRef.current.value = ''
    }, [onChange, showToast, variant])

    return (
        <div className="control-group">
            <label htmlFor="background-select">Background</label>
            <select
                id="background-select"
                value={value?.id || ''}
                onChange={(event) => onChange(backgrounds.find(background => background.id === event.target.value))}
            >
                {value?.isUploaded && <option value={value.id}>{value.name}</option>}
                {backgrounds.map(background => (
                    <option key={background.id} value={background.id}>{background.name}</option>
                ))}
            </select>

            <div className="background-upload">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept={ACCEPTED_IMAGE_TYPES}
                    className="visually-hidden"
                />
                <button
                    type="button"
                    className="upload-button"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Upload background
                </button>
                {value?.isUploaded && (
                    <div className="background-upload-preview">
                        <img src={value.url} alt="" />
                        <span>{value.name}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BackgroundField