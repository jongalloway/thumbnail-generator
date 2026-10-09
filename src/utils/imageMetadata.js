const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const JPEG_XMP_HEADER = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0')

function encodeUtf8(value) {
    return new TextEncoder().encode(value)
}

function decodeAscii(bytes) {
    return String.fromCharCode(...bytes)
}

function concatBytes(...parts) {
    const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
    let offset = 0
    for (const part of parts) {
        result.set(part, offset)
        offset += part.length
    }
    return result
}

function createMetadataXml({ generator, query }) {
    const escapeXml = value => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
        `<x:xmpmeta xmlns:x="adobe:ns:meta/">` +
        `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
        `<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:tg="https://aka.ms/thumbnail-generator/ns/1.0/">` +
        `<xmp:CreatorTool>${escapeXml(generator)}</xmp:CreatorTool>` +
        `<tg:state>${escapeXml(query)}</tg:state>` +
        `</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`
}

function makePngChunk(type, data) {
    const chunk = new Uint8Array(data.length + 12)
    const view = new DataView(chunk.buffer)
    view.setUint32(0, data.length)
    chunk.set(encodeUtf8(type), 4)
    chunk.set(data, 8)

    let crc = 0xffffffff
    for (let i = 4; i < 8 + data.length; i++) {
        crc ^= chunk[i]
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
        }
    }
    view.setUint32(8 + data.length, (crc ^ 0xffffffff) >>> 0)
    return chunk
}

function makeInternationalTextChunk(keyword, text) {
    const keywordBytes = encodeUtf8(keyword)
    const textBytes = encodeUtf8(text)
    const data = new Uint8Array(keywordBytes.length + textBytes.length + 5)
    data.set(keywordBytes)
    data[keywordBytes.length] = 0
    data[keywordBytes.length + 1] = 0
    data[keywordBytes.length + 2] = 0
    data[keywordBytes.length + 3] = 0
    data[keywordBytes.length + 4] = 0
    data.set(textBytes, keywordBytes.length + 5)
    return makePngChunk('iTXt', data)
}

function embedPngMetadata(input, metadata) {
    if (input.length < 33 || !PNG_SIGNATURE.every((value, index) => input[index] === value)) {
        throw new Error('Invalid PNG data')
    }
    if (decodeAscii(input.subarray(12, 16)) !== 'IHDR') {
        throw new Error('PNG is missing its IHDR chunk')
    }
    const ihdrLength = new DataView(input.buffer, input.byteOffset, input.byteLength).getUint32(8)
    if (ihdrLength !== 13) throw new Error('Invalid PNG IHDR chunk')

    const software = makeInternationalTextChunk('Software', metadata.generator)
    const comment = makeInternationalTextChunk('Comment', metadata.query)
    return concatBytes(input.subarray(0, 33), software, comment, input.subarray(33))
}

function embedJpegMetadata(input, metadata) {
    if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) {
        throw new Error('Invalid JPEG data')
    }
    let insertOffset = 2
    while (input[insertOffset] === 0xff && input[insertOffset + 1] === 0xe0) {
        const segmentLength = (input[insertOffset + 2] << 8) | input[insertOffset + 3]
        if (segmentLength < 2 || insertOffset + segmentLength + 2 > input.length) {
            throw new Error('Invalid JPEG APP0 segment')
        }
        insertOffset += segmentLength + 2
    }

    const xml = encodeUtf8(createMetadataXml(metadata))
    const payload = concatBytes(JPEG_XMP_HEADER, xml)
    const segmentLength = payload.length + 2
    if (segmentLength > 0xffff) {
        throw new Error('JPEG metadata is too large to embed')
    }

    const segment = new Uint8Array(payload.length + 4)
    segment.set([0xff, 0xe1, segmentLength >> 8, segmentLength & 0xff])
    segment.set(payload, 4)
    return concatBytes(input.subarray(0, insertOffset), segment, input.subarray(insertOffset))
}

function makeWebpChunk(type, data) {
    const padding = data.length % 2
    const chunk = new Uint8Array(data.length + 8 + padding)
    chunk.set(encodeUtf8(type), 0)
    new DataView(chunk.buffer).setUint32(4, data.length, true)
    chunk.set(data, 8)
    return chunk
}

function makeVp8xChunk(width, height, hasAlpha) {
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || width > 0x1000000 || height > 0x1000000) {
        throw new Error('Invalid WebP dimensions for metadata')
    }
    const data = new Uint8Array(10)
    data[0] = (hasAlpha ? 0x10 : 0) | 0x04
    const view = new DataView(data.buffer)
    view.setUint8(4, (width - 1) & 0xff)
    view.setUint8(5, ((width - 1) >>> 8) & 0xff)
    view.setUint8(6, ((width - 1) >>> 16) & 0xff)
    view.setUint8(7, (height - 1) & 0xff)
    view.setUint8(8, ((height - 1) >>> 8) & 0xff)
    view.setUint8(9, ((height - 1) >>> 16) & 0xff)
    return makeWebpChunk('VP8X', data)
}

function embedWebpMetadata(input, metadata, dimensions) {
    if (input.length < 12 || decodeAscii(input.subarray(0, 4)) !== 'RIFF' ||
        decodeAscii(input.subarray(8, 12)) !== 'WEBP') {
        throw new Error('Invalid WebP data')
    }

    const chunks = []
    for (let offset = 12; offset < input.length;) {
        if (offset + 8 > input.length) throw new Error('Invalid WebP chunk header')
        const type = decodeAscii(input.subarray(offset, offset + 4))
        const size = new DataView(input.buffer, input.byteOffset + offset + 4, 4).getUint32(0, true)
        const chunkLength = 8 + size + (size % 2)
        if (offset + chunkLength > input.length) throw new Error('Invalid WebP chunk length')
        chunks.push({ type, bytes: input.subarray(offset, offset + chunkLength), data: input.subarray(offset + 8, offset + 8 + size) })
        offset += chunkLength
    }
    if (chunks.length === 0) throw new Error('WebP image has no chunks')

    const existingVp8x = chunks.find(chunk => chunk.type === 'VP8X')
    let hasAlpha = chunks.some(chunk => chunk.type === 'ALPH')
    if (!hasAlpha) {
        const vp8l = chunks.find(chunk => chunk.type === 'VP8L')
        hasAlpha = Boolean(vp8l && vp8l.data.length >= 5 && (vp8l.data[4] & 0x10))
    }

    const xmlChunk = makeWebpChunk('XMP ', encodeUtf8(createMetadataXml(metadata)))
    let outputChunks
    if (existingVp8x) {
        if (existingVp8x.data.length !== 10) throw new Error('Invalid WebP VP8X chunk')
        const updatedData = existingVp8x.data.slice()
        updatedData[0] |= 0x04
        const updatedVp8x = makeWebpChunk('VP8X', updatedData)
        outputChunks = [
            updatedVp8x,
            ...chunks.filter(chunk => chunk.type !== 'VP8X' && chunk.type !== 'XMP ').map(chunk => chunk.bytes),
            xmlChunk,
        ]
    } else {
        if (!chunks.some(chunk => chunk.type === 'VP8 ' || chunk.type === 'VP8L')) {
            throw new Error('Unsupported WebP image chunk layout')
        }
        const vp8x = makeVp8xChunk(dimensions.width, dimensions.height, hasAlpha)
        outputChunks = [vp8x, ...chunks.filter(chunk => chunk.type !== 'XMP ').map(chunk => chunk.bytes), xmlChunk]
    }

    const body = concatBytes(encodeUtf8('WEBP'), ...outputChunks)
    const result = concatBytes(encodeUtf8('RIFF'), new Uint8Array(4), body)
    new DataView(result.buffer).setUint32(4, result.length - 8, true)
    return result
}

export async function addImageMetadata(blob, format, metadata, dimensions) {
    const input = new Uint8Array(await blob.arrayBuffer())
    let output
    if (format === 'png') output = embedPngMetadata(input, metadata)
    else if (format === 'jpg' || format === 'jpeg') output = embedJpegMetadata(input, metadata)
    else if (format === 'webp') output = embedWebpMetadata(input, metadata, dimensions)
    else throw new Error(`Unsupported image metadata format: ${format}`)

    return new Blob([output], { type: blob.type })
}
