import { describe, expect, it } from 'react-native-harness'
import {
  Images,
  thumbHashFromBase64String,
  thumbHashToBase64String,
} from 'react-native-nitro-image'

const makeImage = () =>
  Images.createBlankImage(16, 16, false, { r: 0, g: 0, b: 1, a: 1 })

const makeDetailedImage = () => {
  const size = 64
  const bytes = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    bytes[i * 4] = (i * 17) % 256
    bytes[i * 4 + 1] = (i * 31) % 256
    bytes[i * 4 + 2] = (i * 47) % 256
    bytes[i * 4 + 3] = 255
  }
  return Images.loadFromRawPixelData({
    buffer: bytes.buffer,
    width: size,
    height: size,
    pixelFormat: 'RGBA',
  })
}

const expectTemporaryPath = (path: string, extension: 'jpg' | 'png') => {
  expect(path.length).toBeGreaterThan(0)
  expect(path.startsWith('/')).toBe(true)
  expect(path.startsWith('file://')).toBe(false)
  expect(path.toLowerCase().endsWith(`.${extension}`)).toBe(true)
}

const expectFileUrlFetchable = async (path: string) => {
  const response = await fetch(`file://${path}`)
  const bytes = await response.arrayBuffer()
  expect(bytes.byteLength).toBeGreaterThan(0)
}

describe('Image - toRawPixelData', () => {
  it('returns a non-empty pixel buffer with matching dimensions', () => {
    const image = makeImage()
    const raw = image.toRawPixelData()
    expect(raw.width).toBe(16)
    expect(raw.height).toBe(16)
    expect(raw.buffer.byteLength).toBeGreaterThanOrEqual(
      raw.width * raw.height * 2,
    )
    expect(raw.pixelFormat).not.toBe('unknown')
  })

  it('toRawPixelDataAsync resolves with pixel data', async () => {
    const image = makeImage()
    const raw = await image.toRawPixelDataAsync()
    expect(raw.buffer.byteLength).toBeGreaterThan(0)
  })
})

describe('Image - toEncodedImageData', () => {
  it('encodes to PNG', () => {
    const image = makeImage()
    const encoded = image.toEncodedImageData('png')
    expect(encoded.imageFormat).toBe('png')
    expect(encoded.width).toBe(16)
    expect(encoded.height).toBe(16)
    expect(encoded.buffer.byteLength).toBeGreaterThan(0)
  })

  it('encodes to JPEG with quality', async () => {
    const image = makeImage()
    const encoded = await image.toEncodedImageDataAsync('jpg', 70)
    expect(encoded.imageFormat).toBe('jpg')
    expect(encoded.buffer.byteLength).toBeGreaterThan(0)
  })

  it('uses a 0...100 JPEG quality range with 100 as the default', () => {
    const image = makeDetailedImage()
    const lowest = image.toEncodedImageData('jpg', 0)
    const highest = image.toEncodedImageData('jpg', 100)
    const defaultQuality = image.toEncodedImageData('jpg')

    expect(lowest.buffer.byteLength).toBeLessThan(highest.buffer.byteLength)
    expect(Array.from(new Uint8Array(defaultQuality.buffer))).toEqual(
      Array.from(new Uint8Array(highest.buffer)),
    )
  })

  it('rounds fractional JPEG quality to the nearest integer', () => {
    const image = makeDetailedImage()
    const quality0 = image.toEncodedImageData('jpg', 0)
    const quality0Point4 = image.toEncodedImageData('jpg', 0.4)
    const quality99Point5 = image.toEncodedImageData('jpg', 99.5)
    const quality100 = image.toEncodedImageData('jpg', 100)

    expect(Array.from(new Uint8Array(quality0Point4.buffer))).toEqual(
      Array.from(new Uint8Array(quality0.buffer)),
    )
    expect(Array.from(new Uint8Array(quality99Point5.buffer))).toEqual(
      Array.from(new Uint8Array(quality100.buffer)),
    )
  })

  it('rejects quality values outside 0...100', async () => {
    const image = makeImage()
    expect(() => image.toEncodedImageData('jpg', -0.5)).toThrow()
    expect(() => image.toEncodedImageData('jpg', 100.5)).toThrow()
    await expect(
      image.toEncodedImageDataAsync('jpg', -0.5),
    ).rejects.toBeDefined()
    await expect(
      image.saveToTemporaryFileAsync('jpg', 100.5),
    ).rejects.toBeDefined()
  })
})

describe('Image - toBase64Async', () => {
  it('encodes PNG to a bare standard Base64 string', async () => {
    const image = makeImage()
    const base64 = await image.toBase64Async('png')

    expect(base64.length).toBeGreaterThan(0)
    expect(base64.startsWith('data:')).toBe(false)
    expect(base64.length % 4).toBe(0)
    expect(base64).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
    expect(base64.startsWith('iVBORw0KGgo')).toBe(true)
  })

  it('matches toEncodedImageDataAsync for the same format', async () => {
    const image = makeImage()
    const base64 = await image.toBase64Async('png')
    const encoded = await image.toEncodedImageDataAsync('png')

    expect(base64).toBe(thumbHashToBase64String(encoded.buffer))
  })

  it('decodes to valid encoded image bytes', async () => {
    const image = makeImage()
    const base64 = await image.toBase64Async('png')
    const buffer = thumbHashFromBase64String(base64)
    const decoded = Images.loadFromEncodedImageData({
      buffer,
      width: image.width,
      height: image.height,
      imageFormat: 'png',
    })

    expect(decoded.width).toBe(image.width)
    expect(decoded.height).toBe(image.height)
  })

  it('uses a 0...100 JPEG quality range with 100 as the default', async () => {
    const image = makeDetailedImage()
    const lowest = await image.toBase64Async('jpg', 0)
    const highest = await image.toBase64Async('jpg', 100)
    const defaultQuality = await image.toBase64Async('jpg')

    expect(lowest.length).toBeLessThan(highest.length)
    expect(defaultQuality).toBe(highest)
  })

  it('rounds fractional JPEG quality to the nearest integer', async () => {
    const image = makeDetailedImage()
    const quality0 = await image.toBase64Async('jpg', 0)
    const quality0Point4 = await image.toBase64Async('jpg', 0.4)
    const quality99Point5 = await image.toBase64Async('jpg', 99.5)
    const quality100 = await image.toBase64Async('jpg', 100)

    expect(quality0Point4).toBe(quality0)
    expect(quality99Point5).toBe(quality100)
  })

  it('rejects quality values outside 0...100', async () => {
    const image = makeImage()
    await expect(image.toBase64Async('jpg', -0.5)).rejects.toBeDefined()
    await expect(image.toBase64Async('jpg', 100.5)).rejects.toBeDefined()
  })
})

describe('Images - loadFromEncodedImageData', () => {
  it('round-trips through PNG encoding', () => {
    const image = makeImage()
    const encoded = image.toEncodedImageData('png')
    const decoded = Images.loadFromEncodedImageData(encoded)
    expect(decoded.width).toBe(image.width)
    expect(decoded.height).toBe(image.height)
  })
})

describe('Image - saveToTemporaryFileAsync', () => {
  it('writes a JPG to a temporary path that can be loaded back', async () => {
    const image = makeImage()
    const path = await image.saveToTemporaryFileAsync('jpg', 80)
    expectTemporaryPath(path, 'jpg')
    await expectFileUrlFetchable(path)

    const reloaded = await Images.loadFromFileAsync(path)
    expect(reloaded.width).toBe(image.width)
    expect(reloaded.height).toBe(image.height)
  })

  it('writes a PNG to a temporary path with a PNG extension', async () => {
    const image = makeImage()
    const path = await image.saveToTemporaryFileAsync('png')
    expectTemporaryPath(path, 'png')
    await expectFileUrlFetchable(path)

    const reloaded = await Images.loadFromFileAsync(path)
    expect(reloaded.width).toBe(image.width)
    expect(reloaded.height).toBe(image.height)
  })
})
