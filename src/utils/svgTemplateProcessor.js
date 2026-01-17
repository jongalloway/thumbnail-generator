/**
 * SVG Template Processor
 * 
 * Loads SVG template files and replaces tokens with actual values.
 * Tokens use double underscore format: __TOKEN_NAME__
 * This format is URL-safe and won't be encoded by editors like Inkscape.
 */

/**
 * Load an SVG template file and return its content
 * @param {string} templatePath - Path to the SVG template file (relative to public folder)
 * @returns {Promise<string>} - The SVG template content
 */
export async function loadSvgTemplate(templatePath) {
    const response = await fetch(templatePath);
    if (!response.ok) {
        throw new Error(`Failed to load SVG template: ${templatePath}`);
    }
    return response.text();
}

/**
 * Replace tokens in an SVG template with actual values
 * Supports both __TOKEN__ format (recommended) and {{TOKEN}} format (legacy)
 * @param {string} svgContent - The SVG template content
 * @param {Record<string, string>} tokens - Object mapping token names to values
 * @returns {string} - The processed SVG content
 */
export function replaceTokens(svgContent, tokens) {
    let result = svgContent;

    for (const [tokenName, value] of Object.entries(tokens)) {
        // New format: __TOKEN_NAME__ (URL-safe, Inkscape-friendly)
        const newPattern = new RegExp(`__${tokenName}__`, 'g');
        result = result.replace(newPattern, value || '');

        // Legacy format: {{TOKEN_NAME}} (may get URL-encoded by some editors)
        const legacyPattern = new RegExp(`\\{\\{${tokenName}\\}\\}`, 'g');
        result = result.replace(legacyPattern, value || '');
    }

    return result;
}

/**
 * Split topic text into multiple lines based on character limit
 * @param {string} topic - The topic text
 * @param {number} maxCharsPerLine - Maximum characters per line
 * @param {number} maxLines - Maximum number of lines
 * @returns {string[]} - Array of lines
 */
export function wrapTopicText(topic, maxCharsPerLine = 25, maxLines = 3) {
    if (!topic) return ['', '', ''];

    const words = topic.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
            if (lines.length >= maxLines - 1) {
                // Last line - add remaining words
                const remainingWords = words.slice(words.indexOf(word));
                lines.push(remainingWords.join(' '));
                break;
            }
        }
    }

    if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
    }

    // Pad to maxLines
    while (lines.length < maxLines) {
        lines.push('');
    }

    return lines;
}

/**
 * Process an SVG template for the Community Standup
 * @param {Object} options - Processing options
 * @param {string} options.templatePath - Path to the SVG template
 * @param {string} options.topic - The episode topic
 * @param {string} options.background - Background image data URL
 * @param {string[]} options.guests - Array of guest image data URLs
 * @returns {Promise<string>} - The processed SVG content
 */
export async function processCommunityStandupTemplate(options) {
    const { templatePath, topic, background, guests } = options;

    const svgContent = await loadSvgTemplate(templatePath);
    const topicLines = wrapTopicText(topic);

    const tokens = {
        BACKGROUND: background || '',
        TOPIC_LINE_1: escapeXml(topicLines[0]),
        TOPIC_LINE_2: escapeXml(topicLines[1]),
        TOPIC_LINE_3: escapeXml(topicLines[2]),
        GUEST_1: guests[0] || '',
        GUEST_2: guests[1] || '',
        GUEST_3: guests[2] || '',
    };

    return replaceTokens(svgContent, tokens);
}

/**
 * Escape special XML characters
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
