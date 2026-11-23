import { BrowserWindow, screen } from 'electron'

import path from 'node:path'
import { SCAN_REGION_HEIGHT, SCAN_REGION_WIDTH } from '../../config'

const Event = {
  ocrResult: 'ocr-result',
  ocrResultConfirm: 'ocr-result-confirm',
  ocrError: 'ocr-error'
}

export interface IOverlay {
  getInstance(): BrowserWindow
  sendResult(result: unknown): void
  sendResultConfirm(isConfirmed: boolean): void
  sendError(error: unknown): void
  placeOverlay(cursorX: number, cursorY: number): void
}

export class Overlay implements IOverlay {
  private instance: BrowserWindow

  constructor() {
    const preloadPath = path.join(__dirname, '../preload/index.js')
    const htmlPath = path.join(__dirname, '../renderer/index.html')

    this.instance = new BrowserWindow({
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

    this.instance.webContents.on('preload-error', (_event, preloadPath, error) => {
      console.error('[PRELOAD ERROR]', preloadPath, error)
    })

    this.instance.webContents.on('did-finish-load', () => {
      console.log('[OVERLAY] Renderer loaded')
    })

    this.instance.webContents.openDevTools({ mode: 'detach' })
    this.instance.setAlwaysOnTop(true, 'screen-saver')
    this.instance.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    this.instance.setIgnoreMouseEvents(true, { forward: true })
    this.instance.loadFile(htmlPath)
  }

  public getInstance(): BrowserWindow {
    return this.instance
  }

  public sendResult(result: unknown): void {
    this.instance.webContents.send(Event.ocrResult, result)
  }

  public sendResultConfirm(isConfirmed: boolean): void {
    this.instance.webContents.send(Event.ocrResultConfirm, isConfirmed)
  }

  public sendError(error: unknown): void {
    if (this.instance && !this.instance.isDestroyed())
      this.instance.webContents.send(
        Event.ocrError,
        error instanceof Error ? error.message : String(error)
      )
  }

  public placeOverlay(cursorX: number, cursorY: number): void {
    const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY })
    const b = display.bounds

    let x = cursorX - SCAN_REGION_WIDTH / 2
    if (x + SCAN_REGION_WIDTH > b.x + b.width) x = b.x + b.width - SCAN_REGION_WIDTH
    if (x < b.x) x = b.x

    let y = cursorY - SCAN_REGION_HEIGHT / 2
    if (y + SCAN_REGION_HEIGHT > b.y + b.height) y = b.y + b.height - SCAN_REGION_HEIGHT
    if (y < b.y) y = b.y

    this.instance.setPosition(Math.round(x), Math.round(y), false)
  }
}
