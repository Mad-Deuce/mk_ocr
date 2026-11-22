import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import {
  FONT,
  INTERVAL_MS,
  RECOGNIZE_THRESHOLD,
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH
} from './config'
import { ExcelService } from './services/excel/excel.service'
import { recognize } from './services/recognize/recognize.service'
import { Scanner } from './services/scan/scan.service'
import { SpecificationRecord } from './shared/types/excel.types'
import type { RecognizeResult } from './shared/types/recognize.types'

const properties = {
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH,
  FONT,
  RECOGNIZE_THRESHOLD
}

let overlay: BrowserWindow
let isActivated = false
let isConfirmed = false
let result: RecognizeResult

let busy = false
let lastText = ''
let stableCount = 0

let intervalID: ReturnType<typeof setInterval>

function createOverlay(): void {
  const preloadPath = path.join(__dirname, '../preload/index.js')

  overlay = new BrowserWindow({
    show: true,
    frame: false,
    transparent: true,
    resizable: true,
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
    const scanner = new Scanner()
    const scanResult = await scanner.scan(cursor)
    result = recognize(scanResult.rgba, scanResult.width, scanResult.height)
    if (result.text === lastText) stableCount++
    else {
      lastText = result.text
      stableCount = 0
    }
    // Require two consecutive identical readings to suppress transient noise.
    const displayText =
      stableCount >= 1 ? result.text || '—' : result.text ? `${result.text} ·` : '—'
    placeOverlay(cursor.x, cursor.y)

    const specificationRecord: SpecificationRecord | undefined =
      ExcelService.findRecordByPosition(displayText)

    sendResult({
      text: specificationRecord ? `${displayText}-${specificationRecord.name}` : displayText,
      confidence: Math.round(result.confidence * 100),
      count: result.count,
      threshold: result.threshold
    } as RecognizeResult)
  } catch (error) {
    sendError(error)
  } finally {
    busy = false
  }
}

export function sendResult(result: RecognizeResult): void {
  overlay.webContents.send('ocr-result', result)
}
export function sendError(error: unknown): void {
  if (overlay && !overlay.isDestroyed())
    overlay.webContents.send('ocr-error', error instanceof Error ? error.message : String(error))
}

function startLoop(): void {
  scan()
  intervalID = setInterval(scan, INTERVAL_MS)
}

function stopLoop(): void {
  intervalID.close()
}

app.whenReady().then(() => {
  ExcelService.initExcelService()

  createOverlay()
  overlay.hide()

  globalShortcut.register('Control+Space', () => {
    isActivated = !isActivated
    if (isActivated) {
      overlay.show()
      startLoop()
    } else {
      stopLoop()
      overlay.hide()
    }
  })

  globalShortcut.register('Control+Shift+Space', () => {
    if (!isActivated) {
      return
    }

    isConfirmed = !isConfirmed
    if (isConfirmed) {
      overlay.setIgnoreMouseEvents(false)
      stopLoop()
    } else {
      overlay.setIgnoreMouseEvents(true, { forward: true })
      startLoop()
    }

    overlay.webContents.send('ocr-result-confirm', isConfirmed)
  })

  globalShortcut.register('Escape', () => app.quit())
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => app.quit())

ipcMain.handle('get-properties', () => {
  return properties
})

ipcMain.handle('add-part-handler', async () => {
  console.log('Called from renderer: add-part-handler')
  return 'Result from main process'
})
ipcMain.handle('add-place-handler', async () => {
  console.log('Called from renderer: add-place-handler')
  return 'Result from main process'
})
ipcMain.handle('add-fastener-handler', async () => {
  console.log('Called from renderer: add-fastener-handler')
  return 'Result from main process'
})
ipcMain.handle('add-washer-handler', async () => {
  console.log('Called from renderer: add-washer-handler')
  return 'Result from main process'
})
