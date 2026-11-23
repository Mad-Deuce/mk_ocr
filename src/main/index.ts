import { app, globalShortcut, ipcMain, screen } from 'electron'
import {
  FONT,
  INTERVAL_MS,
  RECOGNIZE_THRESHOLD,
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH
} from './config'
import { ExcelService } from './services/excel/excel.service'
import { IOverlay, Overlay } from './services/overlay/Overlay.service'
import { Recognizer } from './services/recognize/Recognizer.service'
import { IRecognizer, RecognizeResult } from './services/recognize/Recognizer.types'
import { Scanner } from './services/scan/Scanner.service'
import { IScanner } from './services/scan/Scanner.types'
import { SpecificationRecord } from './shared/types/excel.types'

const properties = {
  SCAN_REGION_HEIGHT,
  SCAN_REGION_WIDTH,
  FONT,
  RECOGNIZE_THRESHOLD
}
const recognizer: IRecognizer = new Recognizer()
const scanner: IScanner = new Scanner()
ExcelService.initExcelService()

let overlay: IOverlay
let isActivated = false
let isConfirmed = false
let recognizeResult: RecognizeResult

let busy = false

let intervalID: ReturnType<typeof setInterval>

app.whenReady().then(() => {
  overlay = new Overlay()
  overlay.getInstance().hide()

  registerGlobalShortcut()
})

async function main(): Promise<void> {
  if (busy || !isActivated || !overlay || overlay.getInstance().isDestroyed()) return
  busy = true
  try {
    const cursor = screen.getCursorScreenPoint()
    const scanResult = await scanner.scan(cursor)

    recognizeResult = recognizer.recognize(scanResult)

    overlay.placeOverlay(cursor.x, cursor.y)

    const specificationRecord: SpecificationRecord | undefined = ExcelService.findRecordByPosition(
      recognizeResult.text
    )

    overlay.sendResult({
      text: specificationRecord
        ? `${recognizeResult.displayText}-${specificationRecord.name}`
        : recognizeResult.displayText,
      confidence: Math.round(recognizeResult.confidence * 100),
      count: recognizeResult.count,
      threshold: recognizeResult.threshold
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
