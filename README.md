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

To add a new background, simply add your background image (SVG, PNG, or JPG) to `public/backgrounds/`. The app automatically discovers all images in this directory - no manifest or code changes required!

**Tip:** Include "light" in the filename (e.g., `my-light-background.svg`) to automatically set the text variant to dark text for light backgrounds.

## Adding New Logos

To add a new logo, simply add your logo image (SVG, PNG, or JPG) to `public/logos/`. The app automatically discovers all images in this directory - no manifest or code changes required!

## Additional Assets

Additional logos (Azure, Copilot, Visual Studio, NuGet, .NET) are available in the `assets` branch. You can copy individual files to your `public/logos/` directory as needed.

## Example Templates

The `examples/` directory contains reference SVG templates showing different layout styles:
- `title-and-pill.svg` - Simple pill badge with title
- `one-logo.svg`, `two-logos.svg`, `three-logos.svg` - Layouts with logo circles
- `circle-image.svg` - Layout with circular image placeholder
- `split-image.svg` - Split layout with image on right side
- `overlay-image.svg` - Overlay layout style

## Project Structure

```
public/
  backgrounds/        # Background images (auto-discovered)
  logos/              # Logo images (auto-discovered)

examples/             # Reference SVG templates

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
