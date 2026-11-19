import { ElectronAPI } from '@electron-toolkit/preload'
import { OCRResult } from '../main/types'

declare global {
  interface Window {
    electron: ElectronAPI

    api: {
      onResult(callback: (data: OCRResult) => void): () => void

      onError(callback: (message: unknown) => void): () => void

      onConfirm(callback: (isConfirmed: boolean) => void): () => void
    }
  }
}

export {}
