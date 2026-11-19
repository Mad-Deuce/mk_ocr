import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import { Monitor } from 'node-screenshots'
import path from 'path'
import {
  INTERVAL_MS,
  OVERLAY_HEIGHT,
  OVERLAY_WIDTH,
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH
} from './config'
import { recognize } from './services/recognize/recognize.service'
import type { Box, RecognizeResult } from './types'

let overlay: BrowserWindow
let isActivated = false
let result: RecognizeResult
let isResultConfirmed = false

let busy = false
let lastText = ''
let stableCount = 0

let intervalID: ReturnType<typeof setInterval>

function createOverlay(): void {
  const preloadPath = path.join(__dirname, '../preload/index.js')

  overlay = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    show: true,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  overlay.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[PRELOAD ERROR]', preloadPath, error)
  })

  overlay.webContents.on('did-finish-load', () => {
    console.log('[OVERLAY] Renderer loaded')
  })

  overlay.webContents.openDevTools({ mode: 'detach' })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlay.setIgnoreMouseEvents(true, { forward: true })
  overlay.loadFile(path.join(__dirname, '../renderer/index.html'))
}

function intersect(a: Box, b: Box): Box | null {
  const left = Math.max(a.x, b.x),
    top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.w, b.x + b.w),
    bottom = Math.min(a.y + a.h, b.y + b.h)
  return right > left && bottom > top ? { x: left, y: top, w: right - left, h: bottom - top } : null
}

async function captureVirtualRegion(box: Box): Promise<Buffer<ArrayBuffer>> {
  // White padding is appropriate for the configured light-background mode.
  const out = Buffer.alloc(box.w * box.h * 4, 255)
  const monitors = Monitor.all()
  for (const monitor of monitors) {
    const bounds = {
      x: monitor.x(),
      y: monitor.y(),
      w: monitor.width(),
      h: monitor.height()
    }
    const part = intersect({ x: box.x, y: box.y, w: box.w, h: box.h }, bounds)
    if (!part) continue
    const image = monitor.captureImageSync()
    const raw = image.toRawSync(true) // copyOutputData=true is recommended in Electron.
    const localX = part.x - bounds.x,
      localY = part.y - bounds.y
    for (let row = 0; row < part.h; row++) {
      const srcStart = ((localY + row) * bounds.w + localX) * 4
      const dstStart = ((part.y - box.y + row) * box.w + (part.x - box.x)) * 4
      raw.copy(out, dstStart, srcStart, srcStart + part.w * 4)
    }
  }
  return out
}

function placeOverlay(cursorX: number, cursorY: number): void {
  const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY })
  const b = display.bounds

  let x = cursorX - SCAN_REGION_WIDTH / 2
  if (x + SCAN_REGION_WIDTH > b.x + b.width) x = b.x + b.width - SCAN_REGION_WIDTH
  if (x < b.x) x = b.x

  let y = cursorY - SCAN_REGION_HEIGHT / 2
  if (y + SCAN_REGION_HEIGHT > b.y + b.height) y = b.y + b.height - SCAN_REGION_HEIGHT
  if (y < b.y) y = b.y

  overlay.setPosition(Math.round(x), Math.round(y), false)
}

async function scan(): Promise<void> {
  if (busy || !isActivated || !overlay || overlay.isDestroyed()) return
  busy = true
  try {
    const cursor = screen.getCursorScreenPoint()
    const left = Math.round(cursor.x - SCAN_REGION_WIDTH / 2)
    const top = Math.round(cursor.y - SCAN_REGION_HEIGHT / 2)
    const rgba = await captureVirtualRegion({
      x: left,
      y: top,
      w: SCAN_REGION_WIDTH,
      h: SCAN_REGION_HEIGHT
    })
    result = recognize(rgba, SCAN_REGION_WIDTH, SCAN_REGION_HEIGHT)
    if (result.text === lastText) stableCount++
    else {
      lastText = result.text
      stableCount = 0
    }
    // Require two consecutive identical readings to suppress transient noise.
    const displayText =
      stableCount >= 1 ? result.text || '—' : result.text ? `${result.text} ·` : '—'
    placeOverlay(cursor.x, cursor.y)

    overlay.webContents.send('ocr-result', {
      text: displayText,
      confidence: Math.round(result.confidence * 100),
      digits: result.count,
      threshold: result.threshold
    })
  } catch (error) {
    if (overlay && !overlay.isDestroyed())
      overlay.webContents.send('ocr-error', error instanceof Error ? error.message : String(error))
  } finally {
    busy = false
  }
}

function startLoop(): void {
  overlay.show()
  scan()
  intervalID = setInterval(scan, INTERVAL_MS)
}

function stopLoop(): void {
  intervalID.close()
  overlay.hide()
}

app.whenReady().then(() => {
  createOverlay()
  overlay.hide()

  globalShortcut.register('Control+Space', () => {
    isActivated = !isActivated

    if (isActivated) {
      console.log('globalShortcut: Control+Space - activated')
      startLoop()
    } else {
      console.log('globalShortcut: Control+Space - deactivated')
      stopLoop()
    }
  })

  globalShortcut.register('Control+Shift+Space', () => {
    if (isActivated) {
      console.log('globalShortcut: Control+Shift+Space - scanned')
      overlay.webContents.send('ocr-result-confirm', true)
    }
  })

  globalShortcut.register('Escape', () => app.quit())
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => app.quit())
