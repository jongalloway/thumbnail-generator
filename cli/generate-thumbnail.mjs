#!/usr/bin/env node

/**
 * CLI for generating .NET Blog thumbnails.
 *
 * Usage:
 *   node cli/generate-thumbnail.mjs --title "My Title" [options]
 *
 * Options:
 *   --title       Title text (required)
 *   --subtitle    Subtitle text
 *   --pill        Pill/badge text (e.g., "Tutorial", "Guide")
 *   --background  Background filename from public/templates/dotnet-blog/backgrounds/
 *                 or an absolute/relative path to a custom image
 *   --logos       Comma-separated logo names (e.g., "dotnet,csharp,aspire")
 *                 Uses files from public/logos/. Can also be absolute paths.
 *   --variant     "dark" or "light" (default: dark)
 *   --resolution  WIDTHxHEIGHT (default: 1920x1080)
 *   --format      "png" or "svg" (default: png)
 *   --output      Output file path (default: thumbnail-{timestamp}.{format})
 *   --list-backgrounds   List available backgrounds and exit
 *   --list-logos         List available logos and exit
 *   --help        Show help
 */

import { createCanvas } from 'canvas'
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const BACKGROUNDS_DIR = path.join(ROOT, 'public', 'templates', 'dotnet-blog', 'backgrounds')
const LOGOS_DIR = path.join(ROOT, 'public', 'logos')

// ── Argument parsing ──────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {}
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i]
        if (arg === '--help' || arg === '-h') {
            args.help = true
        } else if (arg === '--list-backgrounds') {
            args.listBackgrounds = true
        } else if (arg === '--list-logos') {
            args.listLogos = true
        } else if (arg.startsWith('--')) {
            const key = arg.slice(2)
            const value = argv[++i]
            args[key] = value
        }
    }
    return args
}

function showHelp() {
    console.log(`
.NET Blog Thumbnail Generator CLI

Usage:
  node cli/generate-thumbnail.mjs --title "My Title" [options]

Required:
  --title          Title text

Options:
  --subtitle       Subtitle text
  --pill           Pill/badge text (e.g., "Tutorial")
  --background     Background filename or path (see --list-backgrounds)
  --logos           Comma-separated logo names (see --list-logos)
  --variant        "dark" or "light" (default: dark)
  --resolution     WIDTHxHEIGHT (default: 1920x1080)
  --format         "png" or "svg" (default: png)
  --output         Output file path (default: thumbnail-{timestamp}.{format})

Discovery:
  --list-backgrounds   List available background images
  --list-logos         List available logo images

Examples:
  node cli/generate-thumbnail.mjs --title "What's new in .NET 10" --pill "Release" --logos "dotnet"
  node cli/generate-thumbnail.mjs --title "Getting started with Blazor" --subtitle "A beginner's guide" --background "Azure_Dark_Full-bleed_Azure-Neutral.jpg" --logos "dotnet,csharp"
  node cli/generate-thumbnail.mjs --title "NuGet Tips" --variant light --background "Azure_Light_Full-bleed_Azure-Green-blue.jpg" --format svg
`)
}

function listBackgrounds() {
    if (!fs.existsSync(BACKGROUNDS_DIR)) {
        console.error(`Backgrounds directory not found: ${BACKGROUNDS_DIR}`)
        process.exit(1)
    }
    const files = fs.readdirSync(BACKGROUNDS_DIR).filter(f => /\.(jpg|jpeg|png|svg|webp)$/i.test(f))
    console.log('Available backgrounds:\n')
    for (const f of files) {
        console.log(`  ${f}`)
    }
    console.log(`\n${files.length} backgrounds found in ${BACKGROUNDS_DIR}`)
}

function listLogos() {
    if (!fs.existsSync(LOGOS_DIR)) {
        console.error(`Logos directory not found: ${LOGOS_DIR}`)
        process.exit(1)
    }
    const files = fs.readdirSync(LOGOS_DIR).filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f))
    console.log('Available logos:\n')
    for (const f of files) {
        const name = path.parse(f).name
        console.log(`  ${name}  (${f})`)
    }
    console.log(`\n${files.length} logos found in ${LOGOS_DIR}`)
}

// ── Image helpers ─────────────────────────────────────────────────────────

function fileToDataUrl(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    }
    const mime = mimeMap[ext] || 'application/octet-stream'
    const data = fs.readFileSync(filePath)
    return `data:${mime};base64,${data.toString('base64')}`
}

function resolveBackground(name) {
    if (!name) return null
    // Absolute or relative path
    if (path.isAbsolute(name) || name.includes(path.sep) || name.includes('/')) {
        const resolved = path.resolve(name)
        if (!fs.existsSync(resolved)) {
            console.error(`Background file not found: ${resolved}`)
            process.exit(1)
        }
        return fileToDataUrl(resolved)
    }
    // Lookup in backgrounds dir
    const filePath = path.join(BACKGROUNDS_DIR, name)
    if (!fs.existsSync(filePath)) {
        console.error(`Background not found: ${name}\nRun with --list-backgrounds to see available options.`)
        process.exit(1)
    }
    return fileToDataUrl(filePath)
}

function resolveLogos(logoStr) {
    if (!logoStr) return []
    return logoStr.split(',').map(s => s.trim()).filter(Boolean).map(name => {
        // Check if it's a path
        if (path.isAbsolute(name) || name.includes(path.sep) || name.includes('/')) {
            const resolved = path.resolve(name)
            if (!fs.existsSync(resolved)) {
                console.error(`Logo file not found: ${resolved}`)
                process.exit(1)
            }
            return { url: fileToDataUrl(resolved) }
        }
        // Lookup by name (without extension) in logos dir
        const candidates = [
            path.join(LOGOS_DIR, `${name}.svg`),
            path.join(LOGOS_DIR, `${name}.png`),
            path.join(LOGOS_DIR, name),
        ]
        for (const c of candidates) {
            if (fs.existsSync(c)) return { url: fileToDataUrl(c) }
        }
        console.error(`Logo not found: ${name}\nRun with --list-logos to see available options.`)
        process.exit(1)
    })
}

// ── SVG text utilities ────────────────────────────────────────────────────

function escapeXml(text) {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function wrapTextToWidth(text, maxWidth, ctx, font) {
    if (!text) return []
    if (!ctx || !font || !Number.isFinite(maxWidth) || maxWidth <= 0) {
        return wrapTextFallback(text, 22)
    }
    ctx.font = font
    const words = text.split(/\s+/).filter(Boolean)
    const lines = []
    let current = ''
    for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (ctx.measureText(next).width <= maxWidth) {
            current = next
            continue
        }
        if (current) lines.push(current)
        current = word
    }
    if (current) lines.push(current)
    return lines
}

function wrapTextFallback(text, maxChars) {
    if (!text) return []
    const words = text.split(' ')
    const lines = []
    let currentLine = ''
    for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxChars) {
            currentLine = (currentLine + ' ' + word).trim()
        } else {
            if (currentLine) lines.push(currentLine)
            currentLine = word
        }
    }
    if (currentLine) lines.push(currentLine)
    return lines
}

function parseResolution(resolution) {
    let width = 1920
    let height = 1080
    if (typeof resolution === 'string') {
        const match = resolution.trim().match(/^(\d+)\s*x\s*(\d+)$/i)
        if (match) {
            const w = Number(match[1])
            const h = Number(match[2])
            if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
                width = w
                height = h
            }
        }
    }
    return [width, height]
}

// ── SVG generation (ported from DotNetBlogTemplate.jsx) ───────────────────

function generateSvg({ title, subtitle, pill, logos, variant, resolution, bgDataUrl }) {
    const [width, height] = parseResolution(resolution)

    // Create a node-canvas for text measurement
    const measureCanvas = createCanvas(1, 1)
    const textCtx = measureCanvas.getContext('2d')

    const fontFamily = "'Segoe UI', system-ui, -apple-system, sans-serif"
    // node-canvas rejects font strings containing -apple-system (hyphen-prefixed names
    // break CSS font shorthand parsing), so use a cleaned version for measurement.
    const measureFontFamily = "'Segoe UI', system-ui, sans-serif"
    const scale = width / 1920

    // Margins
    const edgeMarginX = 75 * scale
    const edgeMarginY = 132 * scale

    // Pill
    const pillHeight = 126 * scale
    const pillRadius = pillHeight / 2
    const pillFontSize = 88 * scale
    const pillX = edgeMarginX
    const pillY = edgeMarginY
    const pillPaddingX = 44 * scale
    const pillFont = `600 ${pillFontSize}px ${measureFontFamily}`
    textCtx.font = pillFont
    const pillMeasuredWidth = pill ? textCtx.measureText(pill).width : 0
    // Fallback: ensure pill is at least as wide as a character-count estimate
    const pillFallbackWidth = pill ? pill.length * pillFontSize * 0.6 : 0
    const pillTextWidth = Math.max(pillMeasuredWidth, pillFallbackWidth)
    const pillWidth = pill ? pillTextWidth + (pillPaddingX * 2) : 0

    // Title
    const titleFontSize = 133 * scale
    const titleLineHeight = titleFontSize * 1.1
    const titleX = 73 * scale
    const titleY = 444 * scale
    const titleFont = `700 ${titleFontSize}px ${measureFontFamily}`

    // Subtitle
    const subtitleFontSize = 75 * scale
    const subtitleLineHeight = subtitleFontSize * 1.1
    const subtitleFont = `700 ${subtitleFontSize}px ${measureFontFamily}`

    // Colors
    const textColor = variant === 'dark' ? '#ffffff' : '#0f0f0f'
    const pillBgColor = variant === 'dark' ? '#8dc8e8' : '#5946da'

    // Logos
    const logoCount = logos.length
    const desiredLogoCenterX = width - (376 * scale)
    const logoRightMargin = 55 * scale
    const logoEdgeMarginY = 55 * scale
    const logoGap = (logoCount === 3 ? 18 : 24) * scale

    let logoCircleRadius = 205 * scale
    let logoSpacing = 0
    let logoStartY = height * 0.48
    let logoBaseX = desiredLogoCenterX
    let logoStaggerX = 0

    if (logoCount > 1) {
        const maxStackHeight = Math.max(0, height - (2 * logoEdgeMarginY))
        const fitRadius = (maxStackHeight - ((logoCount - 1) * logoGap)) / (2 * logoCount)
        logoCircleRadius = Math.min(205 * scale, fitRadius)
        logoSpacing = (logoCircleRadius * 2) + logoGap
        const stackHeight = (logoCount * 2 * logoCircleRadius) + ((logoCount - 1) * logoGap)
        const stackTop = Math.max(logoEdgeMarginY, (height - stackHeight) / 2)
        logoStartY = stackTop + logoCircleRadius
        if (logoCount === 3) {
            logoStaggerX = logoCircleRadius * 0.55
        }
        logoBaseX = desiredLogoCenterX - (logoStaggerX / 2)
        const maxBaseX = width - logoRightMargin - logoCircleRadius - logoStaggerX
        logoBaseX = Math.min(logoBaseX, maxBaseX)
    }

    // Text width constraint
    const hasRightSideContent = logos.length > 0
    // node-canvas measures Segoe UI slightly wider than the browser renderer.
    const textRightBoundary = hasRightSideContent ? (width * 0.52) : (width - edgeMarginX)
    const textMaxWidth = Math.max(0, textRightBoundary - titleX)

    const titleLines = wrapTextToWidth(title, textMaxWidth, textCtx, titleFont)
    const subtitleLines = wrapTextToWidth(subtitle, textMaxWidth, textCtx, subtitleFont)

    const subtitleBottomBaselineY = height - edgeMarginY
    const subtitleY = subtitleBottomBaselineY - Math.max(0, (subtitleLines.length - 1) * subtitleLineHeight)

    const uniqueId = `svg-${Date.now()}`

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Background -->
  ${bgDataUrl
        ? `<image href="${bgDataUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
        : `<rect width="${width}" height="${height}" fill="#1a1a2e"/>`}

  <!-- Pill/Badge -->
  ${pill ? `
  <g>
    <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${pillRadius}" fill="${pillBgColor}"/>
    <text x="${pillX + pillWidth / 2}" y="${pillY + pillHeight / 2 + pillFontSize * 0.35}" font-family="${fontFamily}" font-size="${pillFontSize}" font-weight="600" fill="${variant === 'dark' ? '#000000' : '#ffffff'}" text-anchor="middle">${escapeXml(pill)}</text>
  </g>` : ''}

  <!-- Title -->
  ${title ? `
  <text x="${titleX}" y="${titleY}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="700" fill="${textColor}" style="line-height:1.1">
    ${titleLines.map((line, i) =>
        `<tspan x="${titleX}" dy="${i === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
    ).join('\n    ')}
  </text>` : ''}

  <!-- Subtitle -->
  ${subtitle ? `
  <text x="${titleX}" y="${subtitleY}" font-family="${fontFamily}" font-size="${subtitleFontSize}" font-weight="700" fill="${textColor}" style="line-height:1.1">
    ${subtitleLines.map((line, i) =>
        `<tspan x="${titleX}" dy="${i === 0 ? 0 : subtitleLineHeight}">${escapeXml(line)}</tspan>`
    ).join('\n    ')}
  </text>` : ''}

  <!-- Logos -->
  ${logos.map((logo, i) => {
        const y = logoCount > 1 ? (logoStartY + i * logoSpacing) : (height * 0.48)
        const x = logoCount === 3 && i === 1 ? (logoBaseX + logoStaggerX) : logoBaseX
        const logoUrl = logo.url
        const logoClipRadius = logoCircleRadius * 0.9
        const logoSize = logoClipRadius * Math.SQRT2 * 0.98
        return `
  <g transform="translate(${x}, ${y})">
        <circle cx="0" cy="0" r="${logoCircleRadius}" fill="white"/>
    <clipPath id="${uniqueId}-logo-clip-${i}">
      <circle cx="0" cy="0" r="${logoClipRadius}"/>
    </clipPath>
    <image href="${logoUrl}" x="${-logoSize / 2}" y="${-logoSize / 2}" width="${logoSize}" height="${logoSize}" clip-path="url(#${uniqueId}-logo-clip-${i})" preserveAspectRatio="xMidYMid meet"/>
  </g>`
    }).join('')}

</svg>`
}

// ── Raster export ─────────────────────────────────────────────────────────

function renderToPng(svgString, width) {
    const resvg = new Resvg(svgString, {
        fitTo: { mode: 'width', value: width },
        font: {
            loadSystemFonts: true,
        },
    })
    const rendered = resvg.render()
    return rendered.asPng()
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv)

    if (args.help) {
        showHelp()
        process.exit(0)
    }

    if (args.listBackgrounds) {
        listBackgrounds()
        process.exit(0)
    }

    if (args.listLogos) {
        listLogos()
        process.exit(0)
    }

    if (!args.title) {
        console.error('Error: --title is required.\n')
        showHelp()
        process.exit(1)
    }

    const title = args.title
    const subtitle = args.subtitle || ''
    const pill = args.pill || ''
    const variant = args.variant || 'dark'
    const resolution = args.resolution || '1920x1080'
    const format = (args.format || 'png').toLowerCase()
    const [width] = parseResolution(resolution)

    if (!['png', 'svg'].includes(format)) {
        console.error(`Unsupported format: ${format}. Use png or svg.`)
        process.exit(1)
    }

    // Resolve background
    const bgDataUrl = resolveBackground(args.background)

    // Resolve logos
    const logos = resolveLogos(args.logos)

    // Generate SVG
    const svgString = generateSvg({
        title,
        subtitle,
        pill,
        logos,
        variant,
        resolution,
        bgDataUrl,
    })

    // Determine output path
    const defaultName = `thumbnail-${Date.now()}.${format}`
    const outputPath = args.output || defaultName

    if (format === 'svg') {
        fs.writeFileSync(outputPath, svgString, 'utf-8')
    } else {
        const pngBuffer = renderToPng(svgString, width)
        fs.writeFileSync(outputPath, pngBuffer)
    }

    console.log(`Thumbnail saved to: ${outputPath}`)
}

main().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
