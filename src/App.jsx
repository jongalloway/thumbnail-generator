import { useState, useRef, useCallback, useMemo } from 'react'
import './App.css'

// Base path for GitHub Pages
const BASE_PATH = import.meta.env.BASE_URL

// Auto-discover logos using Vite's import.meta.glob
// Any image file in public/logos/ will be automatically included
const logoModules = import.meta.glob('/public/logos/*.{svg,png,jpg,jpeg,gif,webp}', { eager: true, query: '?url', import: 'default' })

// Process discovered logos into a usable format
const discoveredLogos = Object.entries(logoModules).map(([path, url]) => {
  const filename = path.split('/').pop()
  const name = filename.replace(/\.[^.]+$/, '') // Remove extension
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

// Auto-discover backgrounds using Vite's import.meta.glob
// Any image file in public/backgrounds/ will be automatically included
const backgroundModules = import.meta.glob('/public/backgrounds/*.{svg,png,jpg,jpeg,gif,webp}', { eager: true, query: '?url', import: 'default' })

// Process discovered backgrounds into a usable format
const discoveredBackgrounds = Object.entries(backgroundModules).map(([path, url]) => {
  const filename = path.split('/').pop()
  const name = filename.replace(/\.[^.]+$/, '') // Remove extension
  const displayName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  // Determine variant based on filename (default to dark)
  const variant = name.toLowerCase().includes('light') ? 'light' : 'dark'
  return {
    id: name.toLowerCase(),
    name: displayName,
    file: filename,
    url: url,
    variant: variant
  }
})

// Helper function to escape XML special characters
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Helper function to wrap text into lines
function wrapText(text, maxChars) {
  if (!text) return []
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  })
  
  if (currentLine) lines.push(currentLine)
  return lines
}

function App() {
  // State for form inputs
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [pill, setPill] = useState('')
  const [variant, setVariant] = useState(discoveredBackgrounds[0]?.variant || 'dark')
  const [resolution, setResolution] = useState('1200x630')
  
  // State for assets - all discovered at build time
  const [backgrounds] = useState(discoveredBackgrounds)
  const [selectedBackground, setSelectedBackground] = useState(discoveredBackgrounds[0] || null)
  const [logos] = useState(discoveredLogos)
  const [selectedLogos, setSelectedLogos] = useState([])
  const [uploadedLogos, setUploadedLogos] = useState([])
  
  // State for notifications
  const [toast, setToast] = useState(null)
  
  // Ref for file input
  const fileInputRef = useRef(null)
  const previewRef = useRef(null)

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Handle logo selection
  const toggleLogo = useCallback((logo) => {
    setSelectedLogos(prev => {
      const isSelected = prev.some(l => l.id === logo.id)
      if (isSelected) {
        return prev.filter(l => l.id !== logo.id)
      }
      if (prev.length >= 3) {
        showToast('Maximum 3 logos allowed', 'error')
        return prev
      }
      return [...prev, logo]
    })
  }, [showToast])

  // Handle logo removal
  const removeLogo = useCallback((logoId) => {
    setSelectedLogos(prev => prev.filter(l => l.id !== logoId))
    setUploadedLogos(prev => prev.filter(l => l.id !== logoId))
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (selectedLogos.length + uploadedLogos.length >= 3) {
      showToast('Maximum 3 logos allowed', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const newLogo = {
        id: `uploaded-${Date.now()}`,
        name: file.name,
        dataUrl: e.target.result,
        isUploaded: true
      }
      setUploadedLogos(prev => [...prev, newLogo])
      setSelectedLogos(prev => [...prev, newLogo])
    }
    reader.readAsDataURL(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [selectedLogos.length, uploadedLogos.length, showToast])

  // Get text colors based on variant
  const textColor = useMemo(() => variant === 'dark' ? '#ffffff' : '#0f0f0f', [variant])
  // Pill background - solid colors matching the example templates
  const pillBgColor = useMemo(() => variant === 'dark' ? '#8dc8e8' : '#5946da', [variant])

  // Generate SVG content - matching the example template styles
  const generateSvg = useCallback(() => {
    const [width, height] = resolution.split('x').map(Number)
    const bgUrl = selectedBackground?.url || ''
    
    // Font family matching the examples
    const fontFamily = "'Segoe UI', system-ui, -apple-system, sans-serif"
    
    // Scale factor based on 1920x1080 reference
    const scale = width / 1920
    
    // Pill dimensions and position (matching examples)
    const pillHeight = 126 * scale
    const pillRadius = pillHeight / 2
    const pillFontSize = 88 * scale
    const pillX = 75 * scale
    const pillY = 132 * scale
    const pillPaddingX = 68 * scale
    const pillWidth = pill ? (pill.length * pillFontSize * 0.6) + (pillPaddingX * 2) : 0
    
    // Title dimensions (133.333px at 1920 width, bold, line-height 1.1)
    const titleFontSize = 133 * scale
    const titleLineHeight = titleFontSize * 1.1
    const titleX = 73 * scale
    const titleY = 444 * scale
    
    // Subtitle dimensions (74.6667px at 1920 width, bold)
    const subtitleFontSize = 75 * scale
    const subtitleLineHeight = subtitleFontSize * 1.1
    
    // Logo circle (205px radius at 1920 width, positioned ~376px from right edge)
    const logoCircleRadius = 205 * scale
    const logoCircleX = width - (376 * scale)
    const logoCircleY = height * 0.48
    
    // For multiple logos, stack them vertically
    const logoSpacing = (logoCircleRadius * 2 + 20 * scale)
    const logoStartY = logoCircleY - ((selectedLogos.length - 1) * logoSpacing / 2)

    // Calculate title lines
    const titleLines = wrapText(title, Math.floor(22 * (1920 / width)))
    const titleBlockHeight = titleLines.length * titleLineHeight
    
    // Subtitle position (below title block)
    const subtitleY = titleY + titleBlockHeight + (40 * scale)

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <!-- Background -->
        ${selectedBackground ? `<image href="${bgUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` : `<rect width="${width}" height="${height}" fill="#1a1a2e"/>`}
        
        <!-- Pill/Badge -->
        ${pill ? `
          <g>
            <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${pillRadius}" fill="${pillBgColor}"/>
            <text x="${pillX + pillWidth / 2}" y="${pillY + pillHeight / 2 + pillFontSize * 0.35}" font-family="${fontFamily}" font-size="${pillFontSize}" font-weight="600" fill="${variant === 'dark' ? '#000000' : '#ffffff'}" text-anchor="middle">${escapeXml(pill)}</text>
          </g>
        ` : ''}
        
        <!-- Title -->
        ${title ? `
          <text x="${titleX}" y="${titleY}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="700" fill="${textColor}" style="line-height:1.1">
            ${titleLines.map((line, i) => 
              `<tspan x="${titleX}" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
            ).join('')}
          </text>
        ` : ''}
        
        <!-- Subtitle -->
        ${subtitle ? `
          <text x="${titleX}" y="${subtitleY}" font-family="${fontFamily}" font-size="${subtitleFontSize}" font-weight="700" fill="${textColor}" style="line-height:1.1">
            ${wrapText(subtitle, Math.floor(35 * (1920 / width))).map((line, i) => 
              `<tspan x="${titleX}" dy="${i === 0 ? 0 : subtitleLineHeight}">${escapeXml(line)}</tspan>`
            ).join('')}
          </text>
        ` : ''}
        
        <!-- Logos in white circles -->
        ${selectedLogos.map((logo, i) => {
          const y = logoStartY + i * logoSpacing
          const logoUrl = logo.isUploaded ? logo.dataUrl : logo.url
          const logoSize = logoCircleRadius * 1.4
          return `
            <g transform="translate(${logoCircleX}, ${y})">
              <circle cx="0" cy="0" r="${logoCircleRadius}" fill="white" filter="url(#shadow)"/>
              <clipPath id="logo-clip-${i}">
                <circle cx="0" cy="0" r="${logoCircleRadius * 0.85}"/>
              </clipPath>
              <image href="${logoUrl}" x="${-logoSize / 2}" y="${-logoSize / 2}" width="${logoSize}" height="${logoSize}" clip-path="url(#logo-clip-${i})" preserveAspectRatio="xMidYMid meet"/>
            </g>
          `
        }).join('')}
        
        <!-- Shadow filter for logos -->
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="8" flood-opacity="0.15"/>
          </filter>
        </defs>
      </svg>
    `
  }, [resolution, selectedBackground, title, subtitle, pill, selectedLogos, textColor, variant, pillBgColor])

  // Export as PNG
  const exportPng = useCallback(async () => {
    const [width, height] = resolution.split('x').map(Number)
    const svgString = generateSvg()
    
    try {
      // Create a canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      
      // Create image from SVG
      const img = new Image()
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })
      
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `thumbnail-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(downloadUrl)
        showToast('PNG exported successfully!')
      }, 'image/png')
    } catch (err) {
      console.error('Export failed:', err)
      showToast('Export failed. Try SVG export instead.', 'error')
    }
  }, [resolution, generateSvg, showToast])

  // Export as SVG
  const exportSvg = useCallback(() => {
    const svgString = generateSvg()
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thumbnail-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
    showToast('SVG exported successfully!')
  }, [generateSvg, showToast])

  // Get all logos (library + uploaded)
  const allSelectedLogos = [...selectedLogos]

  return (
    <div className="container">
      <header className="header">
        <h1>Blog Thumbnail Generator</h1>
        <p className="subtitle">Create consistent blog thumbnails for sharing</p>
      </header>

      <main className="editor">
        <section className="controls" aria-label="Thumbnail settings">
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
              aria-describedby="background-desc"
            >
              {backgrounds.map(bg => (
                <option key={bg.id} value={bg.id}>{bg.name}</option>
              ))}
            </select>
            <small id="background-desc" className="helper-text">Choose a background image</small>
          </div>

          {/* Variant Selection */}
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

          {/* Title Input */}
          <div className="control-group">
            <label htmlFor="title-input">Title</label>
            <input
              type="text"
              id="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your title"
              maxLength={100}
              aria-describedby="title-desc"
            />
            <small id="title-desc" className="helper-text">Main heading for your thumbnail</small>
          </div>

          {/* Subtitle Input */}
          <div className="control-group">
            <label htmlFor="subtitle-input">Subtitle (optional)</label>
            <input
              type="text"
              id="subtitle-input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Enter subtitle"
              maxLength={150}
            />
          </div>

          {/* Pill/Badge Input */}
          <div className="control-group">
            <label htmlFor="pill-input">Pill/Badge (optional)</label>
            <input
              type="text"
              id="pill-input"
              value={pill}
              onChange={(e) => setPill(e.target.value)}
              placeholder="e.g., Tutorial, Guide"
              maxLength={30}
            />
          </div>

          {/* Logo Selection */}
          <div className="control-group">
            <label>Logos (optional)</label>
            <div className="logo-selector" role="group" aria-label="Select logos">
              <div className="logo-options">
                {logos.map(logo => (
                  <button
                    key={logo.id}
                    type="button"
                    className={`logo-option ${selectedLogos.some(l => l.id === logo.id) ? 'selected' : ''}`}
                    onClick={() => toggleLogo(logo)}
                    aria-pressed={selectedLogos.some(l => l.id === logo.id)}
                    aria-label={`${logo.name} logo`}
                  >
                    <img src={logo.url} alt={logo.name} />
                  </button>
                ))}
              </div>
              <div className="selected-logos">
                <span className="label">Selected:</span>
                <div className="logo-preview-list">
                  {allSelectedLogos.length === 0 ? (
                    <span className="placeholder">None selected (max 3)</span>
                  ) : (
                    allSelectedLogos.map(logo => (
                      <div key={logo.id} className="logo-preview-item">
                        <img 
                          src={logo.isUploaded ? logo.dataUrl : logo.url} 
                          alt={logo.name} 
                        />
                        <button 
                          type="button" 
                          className="remove-btn" 
                          onClick={() => removeLogo(logo.id)}
                          aria-label={`Remove ${logo.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="logo-upload">
              <label className="upload-label">
                Or upload your own:
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*" 
                  className="visually-hidden" 
                />
                <span className="upload-button">Choose File</span>
              </label>
            </div>
          </div>

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

          {/* Export Buttons */}
          <div className="export-actions">
            <button type="button" className="btn btn-primary" onClick={exportPng}>
              Export as PNG
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportSvg}>
              Export as SVG
            </button>
          </div>
        </section>

        {/* Preview Section */}
        <section className="preview-section" aria-label="Thumbnail preview">
          <h2 className="visually-hidden">Preview</h2>
          <div className="preview-container">
            <div 
              ref={previewRef}
              className="preview" 
              dangerouslySetInnerHTML={{ __html: generateSvg() }}
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Blog Thumbnail Generator • <a href="https://github.com/jongalloway/thumbnail-generator">GitHub</a></p>
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
