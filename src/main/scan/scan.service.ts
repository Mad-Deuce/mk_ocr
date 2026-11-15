import { BrowserWindow, screen } from 'electron'
import { Monitor } from 'node-screenshots'
import { recognize } from '../recognize/recognize.service'

const REGION: number = 50
// const INTERVAL_MS: number = 300 // ~3.3 checks/sec

let busy: boolean = false
// let stopped: boolean = false
let stableCount: number = 0
let lastText: string = ''
// let lastRecognizedText: string = ''

export async function scan(overlay: BrowserWindow, stopped: boolean): Promise<void> {
  console.log('in scan function', Date.now())
  console.log('in scan function: busy', busy)
  console.log('in scan function: stopped', stopped)
  console.log('in scan function: overlay', !!overlay)
  console.log('in scan function: overlay isDestroyed', overlay?.isDestroyed())

  if (busy || stopped || !overlay || overlay.isDestroyed()) return
  console.log('in scan function 2', Date.now())

  busy = true
  try {
    const cursor = screen.getCursorScreenPoint()
    const left = Math.round(cursor.x - REGION / 2)
    const top = Math.round(cursor.y - REGION / 2)
    const rgba = await captureVirtualRegion(left, top, REGION, REGION)
    const result = recognize(rgba, REGION, REGION)
    // lastRecognizedText = result.text
    if (result.text === lastText) stableCount++
    else {
      lastText = result.text
      stableCount = 0
    }
    // Require two consecutive identical readings to suppress transient noise.
    const displayText =
      stableCount >= 1 ? result.text || '—' : result.text ? `${result.text} ·` : '—'
    placeOverlay(cursor.x, cursor.y, overlay)

    console.log('in scan function', Date.now(), displayText)
    overlay.webContents.send('api', {
      text: displayText,
      confidence: Math.round(result.confidence * 100),
      digits: result.count,
      threshold: result.threshold
    })
  } catch (error: unknown) {
    if (overlay && !overlay.isDestroyed())
      overlay.webContents.send('ocr-error', error instanceof Error ? error.message : String(error))
  } finally {
    busy = false
  }
}

async function captureVirtualRegion(
  left: number,
  top: number,
  width: number,
  height: number
): Promise<Buffer<ArrayBuffer>> {
  // White padding is appropriate for the configured light-background mode.
  const out = Buffer.alloc(width * height * 4, 255)
  const monitors = Monitor.all()
  for (const monitor of monitors) {
    const bounds = {
      x: monitor.x(),
      y: monitor.y(),
      width: monitor.width(),
      height: monitor.height()
    }
    const part = intersect({ x: left, y: top, width, height }, bounds)
    if (!part) continue
    const image = monitor.captureImageSync()
    const raw = image.toRawSync(true) // copyOutputData=true is recommended in Electron.
    const localX = part.x - bounds.x,
      localY = part.y - bounds.y
    for (let row = 0; row < part.height; row++) {
      const srcStart = ((localY + row) * bounds.width + localX) * 4
      const dstStart = ((part.y - top + row) * width + (part.x - left)) * 4
      raw.copy(out, dstStart, srcStart, srcStart + part.width * 4)
    }
  }
  return out
}

function intersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } | null {
  const left = Math.max(a.x, b.x),
    top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width),
    bottom = Math.min(a.y + a.height, b.y + b.height)
  return right > left && bottom > top
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : null
}

function placeOverlay(cursorX: number, cursorY: number, overlay: BrowserWindow): void {
  const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY })
  const b = display.bounds
  const roiLeft = cursorX - REGION / 2
  let x = roiLeft + REGION + 12
  if (x + 190 > b.x + b.width) x = roiLeft - 202
  x = Math.max(b.x, Math.min(x, b.x + b.width - 190))
  let y = cursorY - 27
  y = Math.max(b.y, Math.min(y, b.y + b.height - 54))
  overlay.setPosition(Math.round(x), Math.round(y), false)
}
