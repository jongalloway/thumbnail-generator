# Blog Thumbnail Generator

A static, client-side thumbnail generator for blog posts. Create consistent blog thumbnails using predefined backgrounds, customizable text, and logos.

![Blog Thumbnail Generator](./docs/preview.png)

## Features

- 🎨 Multiple background options (dark, light, and colored gradients)
- ✏️ Customizable title, subtitle, and pill/badge text
- 🏷️ Support for 1-3 logos displayed in white circles (stacked layout)
- 📤 Upload your own logos
- 💾 Export as JPG (default), PNG, WEBP, or SVG
- 📱 Multiple resolution options (default: 1920×1080)
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

To add a new background, add an image (SVG, PNG, JPG/JPEG, GIF, or WEBP) to `public/backgrounds/`. The app automatically discovers all images in this directory - no manifest or code changes required!

**Tip:** Include "light" in the filename (e.g., `my-light-background.svg`) to automatically set the text variant to dark text for light backgrounds.

## Adding New Logos

To add a new logo, add an image (SVG, PNG, JPG/JPEG, GIF, or WEBP) to `public/logos/`. The app automatically discovers all images in this directory - no manifest or code changes required!

**Logo rendering notes:**

- Up to 3 logos can be selected.
- Logos are clipped inside a circular area and sized to avoid cutting off square-ish logos.

## Additional Assets

Additional logos (Azure, Copilot, Visual Studio, NuGet, .NET) are available in the `assets` branch. You can copy individual files to your `public/logos/` directory as needed.

## Example Templates

The `docs/examples/` directory contains reference SVG templates showing different layout styles:

- `title-and-pill.svg` - Simple pill badge with title
- `one-logo.svg`, `two-logos.svg`, `three-logos.svg` - Layouts with logo circles
- `circle-image.svg` - Layout with circular image placeholder
- `split-image.svg` - Split layout with image on right side
- `overlay-image.svg` - Overlay layout style

## Project Structure

```text
public/
  logos/              # Logo images (auto-discovered)

  templates/          # Per-template assets (auto-discovered)
    dotnet-blog/
      backgrounds/
    dotnet-community-standup/
      backgrounds/
      *.svg           # SVG layout templates

docs/examples/         # Reference SVG templates

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

- **JPG (default)** - Small file sizes; good for most sharing scenarios
- **PNG** - Lossless; good when you need crisp edges or transparency (if you add it later)
- **WEBP** - Usually smaller than JPG/PNG; great when supported by your target platform
- **SVG** - Best for high-quality scaling and further editing

**Notes:**

- Raster export inlines referenced images (backgrounds/logos) before rendering, so exported files consistently include all assets.
- Backgrounds are stretched to fill the export resolution (no letterboxing).

## Layout Behavior

- When logos are present, the title/subtitle wrap to the left side to avoid colliding with the logo stack.
- The subtitle is bottom-aligned with a consistent margin.
- The pill/badge sizing is measured using the actual font metrics to better fit the text.

## Accessibility

- All form inputs are properly labeled
- Keyboard navigation supported
- Color contrast meets WCAG guidelines
- Focus states clearly visible

## License

MIT License - see [LICENSE](./LICENSE) for details.
