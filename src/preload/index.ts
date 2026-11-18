// import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onResult: (callback: (data: { text: string; confidence: number; digits: number }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { text: string; confidence: number; digits: number }
    ): void => {
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
  }
}

contextBridge.exposeInMainWorld('api', api)

// if (process.contextIsolated) {
//   try {
//     contextBridge.exposeInMainWorld('electron', electronAPI)
//     contextBridge.exposeInMainWorld('api', api)
//   } catch (error) {
//     console.error(error)
//   }
// } else {
//   // @ts-ignore (define in dts)
//   window.electron = electronAPI
//   // @ts-ignore (define in dts)
//   window.api = api
// }
