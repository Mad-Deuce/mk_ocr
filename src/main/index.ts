import { app, globalShortcut, ipcMain, screen } from 'electron'
import {
  FONT,
  INTERVAL_MS,
  RECOGNIZE_THRESHOLD,
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH
} from './config'
import { ExcelService } from './services/excel/excel.service'
import { Overlay } from './services/overlay/Overlay.service'
import { Recognizer } from './services/recognize/Recognizer.service'
import { IRecognizer } from './services/recognize/Recognizer.types'
import { Scanner } from './services/scan/Scanner.service'
import { IScanner } from './services/scan/Scanner.types'
import { SpecificationRecord } from './shared/types/excel.types'
import type { RecognizeResult } from './shared/types/recognize.types'

const properties = {
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH,
  FONT,
  RECOGNIZE_THRESHOLD
}

let overlay: Overlay
let isActivated = false
let isConfirmed = false
let result: RecognizeResult

let busy = false
let lastText = ''
let stableCount = 0

let intervalID: ReturnType<typeof setInterval>

async function main(): Promise<void> {
  if (busy || !isActivated || !overlay || overlay.getInstance().isDestroyed()) return
  busy = true
  try {
    const cursor = screen.getCursorScreenPoint()
    const scanner: IScanner = new Scanner()
    const scanResult = await scanner.scan(cursor)

    const recognizer: IRecognizer = new Recognizer()
    result = recognizer.recognize(scanResult)
    if (result.text === lastText) stableCount++
    else {
      lastText = result.text
      stableCount = 0
    }
    // Require two consecutive identical readings to suppress transient noise.
    const displayText =
      stableCount >= 1 ? result.text || '—' : result.text ? `${result.text} ·` : '—'
    overlay.placeOverlay(cursor.x, cursor.y)

    const specificationRecord: SpecificationRecord | undefined =
      ExcelService.findRecordByPosition(displayText)

    overlay.sendResult({
      text: specificationRecord ? `${displayText}-${specificationRecord.name}` : displayText,
      confidence: Math.round(result.confidence * 100),
      count: result.count,
      threshold: result.threshold
    })
  } catch (error) {
    overlay.sendError(error)
  } finally {
    busy = false
  }
}

function startLoop(): void {
  main()
  intervalID = setInterval(main, INTERVAL_MS)
}

function stopLoop(): void {
  intervalID.close()
}

app.whenReady().then(() => {
  ExcelService.initExcelService()

  overlay = new Overlay()
  overlay.getInstance().hide()

  registerGlobalShortcut()
})

function registerGlobalShortcut(): void {
  globalShortcut.register('Control+Space', () => {
    isActivated = !isActivated
    if (isActivated) {
      overlay.getInstance().show()
      startLoop()
    } else {
      stopLoop()
      overlay.getInstance().hide()
    }
  })

  globalShortcut.register('Control+Shift+Space', () => {
    if (!isActivated) {
      return
    }

    isConfirmed = !isConfirmed
    if (isConfirmed) {
      overlay.getInstance().setIgnoreMouseEvents(false)
      stopLoop()
    } else {
      overlay.getInstance().setIgnoreMouseEvents(true, { forward: true })
      startLoop()
    }

    overlay.sendResultConfirm(isConfirmed)
  })

  globalShortcut.register('Escape', () => app.quit())
}

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
