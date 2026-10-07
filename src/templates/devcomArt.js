/**
 * Approved developer.microsoft.com artwork used by the Microsoft Developer Blog
 * template. These assets are derived only from the source files supplied for
 * this project; do not add generated substitute illustrations here.
 *
 * Kept out of the template component file so Fast Refresh keeps working, and so
 * the asset map can be imported by tests without rendering a component.
 *
 * Vite rewrites these to hashed, base-aware URLs, so they resolve in dev, in the
 * built site, and when `inlineSvgImages` fetches them during export.
 */
const artModules = import.meta.glob('../../public/templates/microsoft-developer-blog/art/*.{svg,png}', { eager: true, query: '?url', import: 'default' })

export const DEVCOM_ART = Object.entries(artModules).reduce((acc, [path, url]) => {
    const id = path.split('/').pop().replace(/\.[^.]+$/, '')
    acc[id] = url
    return acc
}, {})

export default DEVCOM_ART
