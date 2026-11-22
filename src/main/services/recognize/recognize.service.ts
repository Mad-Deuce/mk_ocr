import { createCanvas } from '@napi-rs/canvas'
import { FONT, GLYPH_H, GLYPH_W } from '../../config'
import {
  Box,
  BoxWithPixels,
  Digit,
  RecognizeResult,
  Template
} from '../../shared/types/recognize.types'

const templates = renderTemplates()

export function recognize(rgba: Uint8Array, width: number, height: number): RecognizeResult {
  const gray = grayscale(rgba)
  const threshold = otsuThreshold(gray)
  const mask = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] < threshold ? 1 : 0
  const components = findComponents(mask, width, height)
  const digits: Digit[] = []
  for (const box of components) {
    const glyph = resizeMask(mask, width, height, box)
    let bestDigit = '',
      bestScore = 0
    for (const [digit, template] of templates) {
      const score = tolerantScore(glyph, template)
      if (score > bestScore) {
        bestScore = score
        bestDigit = digit
      }
    }
    if (bestScore >= 0.48)
      digits.push({ digit: bestDigit, score: bestScore, x: box.x, y: box.y, w: box.w, h: box.h })
  }
  const text = digits.map((d) => d.digit).join('')
  const confidence = digits.length ? digits.reduce((sum, d) => sum + d.score, 0) / digits.length : 0

  return { text, confidence, threshold, count: digits.length, boxes: digits }
}

function otsuThreshold(gray: Uint8Array): number {
  const hist = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0,
    wB = 0,
    maxVariance = -1,
    threshold = 170
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) ** 2
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return Math.max(65, Math.min(215, threshold))
}

function grayscale(rgba: Uint8Array): Uint8Array {
  const gray = new Uint8Array(rgba.length / 4)
  for (let p = 0, i = 0; p < rgba.length; p += 4, i++) {
    gray[i] = Math.round(0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2])
  }
  return gray
}

function findComponents(mask: Uint8Array, width: number, height: number): BoxWithPixels[] {
  const seen = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const result: BoxWithPixels[] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    let head = 0,
      tail = 0
    queue[tail++] = start
    seen[start] = 1
    let minX = width,
      minY = height,
      maxX = -1,
      maxY = -1,
      pixels = 0
    while (head < tail) {
      const at = queue[head++]
      const x = at % width,
        y = (at / width) | 0
      pixels++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          const ni = yy * width + xx
          if (mask[ni] && !seen[ni]) {
            seen[ni] = 1
            queue[tail++] = ni
          }
        }
      }
    }
    const w = maxX - minX + 1,
      h = maxY - minY + 1
    if (pixels >= 8 && w >= 2 && h >= 7 && w <= 38 && h <= 42 && h / w >= 0.42) {
      result.push({ x: minX, y: minY, w, h, pixels })
    }
  }
  return result.sort((a, b) => a.x - b.x)
}

function resizeMask(
  mask: Uint8Array,
  sourceW: number,
  _sourceH: number,
  box: Box,
  outW = GLYPH_W,
  outH = GLYPH_H
): Uint8Array {
  const out = new Uint8Array(outW * outH)
  // A small uniform inset prevents edge pixels from being clipped during normalization.
  const pad = 1
  const innerW = outW - pad * 2,
    innerH = outH - pad * 2
  for (let y = 0; y < innerH; y++) {
    const sy = box.y + Math.min(box.h - 1, Math.floor(((y + 0.5) * box.h) / innerH))
    for (let x = 0; x < innerW; x++) {
      const sx = box.x + Math.min(box.w - 1, Math.floor(((x + 0.5) * box.w) / innerW))
      out[(y + pad) * outW + x + pad] = mask[sy * sourceW + sx]
    }
  }
  return out
}

function renderTemplates(): Map<string, Template> {
  const templates = new Map()
  for (let digit = 0; digit <= 9; digit++) {
    const canvas = createCanvas(56, 48)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 56, 48)
    ctx.fillStyle = '#000'
    ctx.font = FONT
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(String(digit), 8, 34)
    const image = ctx.getImageData(0, 0, 56, 48).data
    const mask = new Uint8Array(56 * 48)
    let minX = 56,
      minY = 48,
      maxX = -1,
      maxY = -1
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 56; x++) {
        const alpha = image[(y * 56 + x) * 4 + 3]
        if (alpha > 80) {
          mask[y * 56 + x] = 1
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    templates.set(
      String(digit),
      resizeMask(mask, 56, 48, { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 })
    )
  }

  return templates
}

function tolerantScore(candidate: Uint8Array, template: Template): number {
  let candidateCount = 0,
    templateCount = 0,
    hitCandidate = 0,
    hitTemplate = 0
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i]) {
      candidateCount++
      const x = i % GLYPH_W,
        y = (i / GLYPH_W) | 0
      let found = false
      for (let dy = -1; dy <= 1 && !found; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy
          if (xx >= 0 && xx < GLYPH_W && yy >= 0 && yy < GLYPH_H && template[yy * GLYPH_W + xx]) {
            found = true
            break
          }
        }
      if (found) hitCandidate++
    }
    if (template[i]) {
      templateCount++
      const x = i % GLYPH_W,
        y = (i / GLYPH_W) | 0
      let found = false
      for (let dy = -1; dy <= 1 && !found; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy
          if (xx >= 0 && xx < GLYPH_W && yy >= 0 && yy < GLYPH_H && candidate[yy * GLYPH_W + xx]) {
            found = true
            break
          }
        }
      if (found) hitTemplate++
    }
  }
  if (!candidateCount || !templateCount) return 0
  const precision = hitCandidate / candidateCount
  const recall = hitTemplate / templateCount
  const res = (2 * precision * recall) / (precision + recall || 1)

  return res
}
