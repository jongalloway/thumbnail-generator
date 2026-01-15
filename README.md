# Blog Thumbnail Generator

A static, client-side thumbnail generator for blog posts. Create consistent blog thumbnails using predefined backgrounds, customizable text, and logos.

![Blog Thumbnail Generator](./docs/preview.png)

## Features

- 🎨 Multiple background options (dark, light, and colored gradients)
- ✏️ Customizable title, subtitle, and pill/badge text
- 🏷️ Support for 1-3 logos displayed in white circles
- 📤 Upload your own logos
- 💾 Export as PNG or SVG
- 📱 Multiple resolution options (Social/OG, HD, 720p)
- ♿ Accessible UI with keyboard navigation
- 🚀 Runs entirely in the browser - no server required

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to GitHub Pages

The site is configured to deploy to GitHub Pages. Simply push to the main branch and the GitHub Actions workflow will build and deploy automatically.

## Adding New Backgrounds

To add a new background:

1. Add your background image (SVG recommended) to `public/backgrounds/`
2. Update `public/backgrounds/manifest.json` to include your new background:

```json
{
  "id": "my-background",
  "name": "My Background",
  "file": "my-background.svg",
  "variant": "dark"  // or "light"
}
```

No code changes required!

## Adding New Logos

To add a new logo:

1. Add your logo image (SVG, PNG, or JPG) to `public/logos/`
2. Update `public/logos/manifest.json` to include your new logo:

```json
{
  "id": "my-logo",
  "name": "My Logo",
  "file": "my-logo.svg"
}
```

No code changes required!

## Additional Assets

Additional logos (Azure, Copilot, Visual Studio, NuGet, .NET) and example thumbnails are available in the `assets` branch. You can merge these assets into your deployment or copy individual files as needed.

## Project Structure

```
public/
  backgrounds/        # Background images and manifest
  logos/              # Logo images and manifest
  templates/          # SVG templates (future use)

src/
  App.jsx             # Main React component
  App.css             # Component styles
  index.css           # Global styles
  main.jsx            # React entry point

index.html            # HTML entry point
vite.config.js        # Vite configuration
```

## Technology Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Vanilla CSS** - Styling (no Tailwind)
- **SVG** - Thumbnail composition format

## Export Options

- **PNG** - Best for social sharing (Twitter, LinkedIn, etc.)
- **SVG** - Best for high-quality scaling and further editing

## Accessibility

- All form inputs are properly labeled
- Keyboard navigation supported
- Color contrast meets WCAG guidelines
- Focus states clearly visible

## License

MIT License - see [LICENSE](./LICENSE) for details.
