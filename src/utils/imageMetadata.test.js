import { describe, expect, it } from 'vitest'
import { addImageMetadata } from './imageMetadata'

const metadata = { generator: 'thumbnail-generator', query: 'template=dotnet-blog&title=Hello' }

function pngChunk(type, data) {
    const bytes = new Uint8Array(data.length + 12)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, data.length)
    bytes.set(new TextEncoder().encode(type), 4)
    bytes.set(data, 8)
    return bytes
}

function webpChunk(type, data) {
    const chunk = new Uint8Array(data.length + 8 + (data.length % 2))
    chunk.set(new TextEncoder().encode(type))
    new DataView(chunk.buffer).setUint32(4, data.length, true)
    chunk.set(data, 8)
    return chunk
}

function join(...parts) {
    const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
    let offset = 0
    for (const part of parts) {
        result.set(part, offset)
        offset += part.length
    }
    return result
}

function bytesToText(bytes) {
    return new TextDecoder().decode(bytes)
}

describe('addImageMetadata', () => {
    it('adds PNG iTXt Software and Comment metadata chunks after IHDR', async () => {
        const png = join(
            new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
            pngChunk('IHDR', new Uint8Array(13)),
            pngChunk('IDAT', new Uint8Array([1, 2, 3])),
            pngChunk('IEND', new Uint8Array())
        )
        const result = new Uint8Array(await (await addImageMetadata(new Blob([png], { type: 'image/png' }), 'png', metadata)).arrayBuffer())
        const text = bytesToText(result)

        expect(text.indexOf('iTXt')).toBeGreaterThan(text.indexOf('IHDR'))
        expect(text).toContain('Software\0\0\0\0\0thumbnail-generator')
        expect(text).toContain('Comment\0\0\0\0\0template=dotnet-blog&title=Hello')
        expect(text.indexOf('IDAT')).toBeGreaterThan(text.indexOf('Comment'))
    })

    it('adds an XMP APP1 segment to JPEG exports', async () => {
        const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
        const result = new Uint8Array(await (await addImageMetadata(new Blob([jpeg], { type: 'image/jpeg' }), 'jpg', metadata)).arrayBuffer())
        const text = bytesToText(result)

        expect(result[2]).toBe(0xff)
        expect(result[3]).toBe(0xe1)
        expect(text).toContain('http://ns.adobe.com/xap/1.0/')
        expect(text).toContain('<xmp:CreatorTool>thumbnail-generator</xmp:CreatorTool>')
        expect(text).toContain('<tg:state>template=dotnet-blog&amp;title=Hello</tg:state>')
    })

    it('converts a simple WebP to extended WebP and adds its XMP chunk', async () => {
        const vp8Data = new Uint8Array([1, 2, 3, 4])
        const webp = join(
            new TextEncoder().encode('RIFF'),
            new Uint8Array(4),
            new TextEncoder().encode('WEBP'),
            webpChunk('VP8 ', vp8Data)
        )
        new DataView(webp.buffer).setUint32(4, webp.length - 8, true)
        const result = new Uint8Array(await (await addImageMetadata(
            new Blob([webp], { type: 'image/webp' }),
            'webp',
            metadata,
            { width: 1200, height: 630 }
        )).arrayBuffer())
        const text = bytesToText(result)
        const vp8xOffset = text.indexOf('VP8X')
        const xmpOffset = text.indexOf('XMP ')

        expect(new DataView(result.buffer).getUint32(4, true)).toBe(result.length - 8)
        expect(result[vp8xOffset + 8] & 0x04).toBe(0x04)
        expect(result[vp8xOffset + 12]).toBe(0xaf)
        expect(result[vp8xOffset + 13]).toBe(0x04)
        expect(result[vp8xOffset + 15]).toBe(0x75)
        expect(result[vp8xOffset + 16]).toBe(0x02)
        expect(xmpOffset).toBeGreaterThan(vp8xOffset)
        expect(text).toContain('<xmp:CreatorTool>thumbnail-generator</xmp:CreatorTool>')
        expect(text).toContain('<tg:state>template=dotnet-blog&amp;title=Hello</tg:state>')
    })

    it('rejects malformed image data instead of returning an untagged export', async () => {
        await expect(addImageMetadata(new Blob(['not an image']), 'png', metadata))
            .rejects.toThrow('Invalid PNG data')
    })
})
