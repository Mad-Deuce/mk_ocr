import { contextBridge, ipcRenderer } from 'electron'
import { RecognizeResult } from '../main/shared/types/types'

const api = {
  onResult: (callback: (data: RecognizeResult) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: RecognizeResult): void => {
      callback(data)
    }

    ipcRenderer.on('ocr-result', listener)

    return () => {
      ipcRenderer.removeListener('ocr-result', listener)
    }
  },

  onError: (callback: (message: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: unknown): void => {
      callback(message)
    }

    ipcRenderer.on('ocr-error', listener)

    return () => {
      ipcRenderer.removeListener('ocr-error', listener)
    }
  },

  onConfirm: (callback: (isConfirmed: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: boolean): void => {
      callback(data)
    }

    ipcRenderer.on('ocr-result-confirm', listener)

    return () => {
      ipcRenderer.removeListener('ocr-result-confirm', listener)
    }
  },

  getProperties: () => ipcRenderer.invoke('get-properties')
}

contextBridge.exposeInMainWorld('api', api)
