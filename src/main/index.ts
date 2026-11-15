import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import { Monitor } from 'node-screenshots'
import fs from 'node:fs'
import path from 'path'
import { recognize } from './recognizer'

const REGION = 50
const INTERVAL_MS = 300 // ~3.3 checks/sec
let overlay: BrowserWindow
let busy = false
let lastText = ''
let stableCount = 0
let stopped = false
let lastRecognizedText = ''

function createOverlay(): void {
  const preloadPath = path.join(__dirname, '../preload/index.js')

  console.log('[MAIN] __dirname:', __dirname)
  console.log('[MAIN] preloadPath:', preloadPath)
  console.log('[MAIN] preload exists:', fs.existsSync(preloadPath))

  overlay = new BrowserWindow({
    width: 190,
    height: 54,
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

  // overlay.webContents.on('console-message', (_event, details) => {
  //   console.log('[OVERLAY CONSOLE]', details.message)
  // })

  overlay.webContents.openDevTools({ mode: 'detach' })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlay.setIgnoreMouseEvents(true, { forward: true })
  overlay.loadFile(path.join(__dirname, '../renderer/index.html'))

  // console.log('Preload path:', overlay.webContents.session)
  // console.log('WebPreferences:', overlay.webContents.getLastWebPreferences())
}

type Box = { x: number; y: number; width: number; height: number }

function intersect(a: Box, b: Box): Box | null {
  const left = Math.max(a.x, b.x),
    top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width),
    bottom = Math.min(a.y + a.height, b.y + b.height)
  return right > left && bottom > top
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : null
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

function placeOverlay(cursorX: number, cursorY: number): void {
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

async function scan(): Promise<void> {
  if (busy || stopped || !overlay || overlay.isDestroyed()) return
  busy = true
  try {
    const cursor = screen.getCursorScreenPoint()
    const left = Math.round(cursor.x - REGION / 2)
    const top = Math.round(cursor.y - REGION / 2)
    const rgba = await captureVirtualRegion(left, top, REGION, REGION)
    const result = recognize(rgba, REGION, REGION)
    lastRecognizedText = result.text
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
  scan()
  setInterval(scan, INTERVAL_MS)
}

function logOCR(text: string): void {
  const logPath = path.join(app.getPath('userData'), 'ocr.log')

  fs.appendFileSync(logPath, `[${new Date().toLocaleString()}] ${text}\n`, 'utf8')

  console.log(logPath)
  console.log(text)
}

app.whenReady().then(() => {
  createOverlay()
  globalShortcut.register('F8', () => {
    stopped = !stopped
    if (!stopped) scan()
  })
  globalShortcut.register('Escape', () => app.quit())
  globalShortcut.register('Control+1', () => {
    logOCR(lastRecognizedText || '(empty)')
  })
  startLoop()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
app.on('window-all-closed', () => app.quit())
