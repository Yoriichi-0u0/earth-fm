import {imageToSequence} from '../../src/lib/imageSonification'

export const mapWidth = 1024
export const mapHeight = 512
export const bandTop = 171
export const bandHeight = 170
export const stripCount = 48

export function scanMap(image: HTMLImageElement) {
  if (image.naturalWidth !== mapWidth || image.naturalHeight !== mapHeight) {
    throw new Error('The map has unexpected dimensions.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(image, 0, bandTop, mapWidth, bandHeight, 0, 0, canvas.width, canvas.height)
  return imageToSequence(ctx.getImageData(0, 0, canvas.width, canvas.height), stripCount)
}
