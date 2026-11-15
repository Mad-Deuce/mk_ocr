import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI

    api: {
      onResult(
        callback: (data: { text: string; confidence: number; digits: number }) => void
      ): () => void

      onError(callback: (message: unknown) => void): () => void
    }
  }
}

export {}
