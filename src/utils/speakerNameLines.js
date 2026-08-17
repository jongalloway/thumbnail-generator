export function wrapSpeakerNames(names, maxWidth, context, font) {
    if (!names.length) return []

    if (!context || !font || !Number.isFinite(maxWidth) || maxWidth <= 0) {
        return [`with ${names[0]}${names.length > 1 ? ' +' : ''}`, ...names.slice(1)]
    }

    context.font = font
    const segments = names.map((name, index) => (
        index === 0
            ? `with ${name}${names.length > 1 ? ' +' : ''}`
            : `${name}${index < names.length - 1 ? ' +' : ''}`
    ))
    const lines = []
    let currentLine = ''

    for (const segment of segments) {
        const nextLine = currentLine ? `${currentLine} ${segment}` : segment
        if (currentLine && context.measureText(nextLine).width > maxWidth) {
            lines.push(currentLine)
            currentLine = segment
        } else {
            currentLine = nextLine
        }
    }

    if (currentLine) lines.push(currentLine)
    return lines
}