/**
 * Background label + standup-name helpers
 *
 * Kept in a standalone, dependency-free module so the mapping logic can be
 * unit-tested quickly without importing the full App component.
 */

// Standup name (pill top line) keyed by background id (lowercased filename
// without extension). Doubles as the background dropdown label so the selector
// matches the show name. Prefilled into the (still editable) Standup Name field
// on background selection, so users can override (e.g., ASP.NET CORE -> BLAZOR).
export const STANDUP_NAME_BY_BACKGROUND = {
    'dotnet-standup-aspnet': 'ASP.NET CORE',
    'dotnet-standup-ai': '.NET & AI',
    'dotnet-standup-data': '.NET DATA',
    'dotnet-standup-maui': '.NET MAUI',
    'dotnet-standup-runtime': 'LANGUAGES & RUNTIME',
}

// Build a human-friendly display name for a background filename (without extension)
export function formatBackgroundLabel(name) {
    const override = STANDUP_NAME_BY_BACKGROUND[name.toLowerCase()]
    if (override) return override
    return name
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
