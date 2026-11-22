import { ElectronAPI } from '@electron-toolkit/preload'
import { RecognizeResult } from '../main/shared/types/types'

declare global {
  interface Window {
    electron: ElectronAPI

    api: {
      onResult(callback: (data: RecognizeResult) => void): () => void

      onError(callback: (message: unknown) => void): () => void

      onConfirm(callback: (isConfirmed: boolean) => void): () => void

      getProperties: () => Promise<{
        SCAN_REGION_HEIGHT: number
        SCAN_REGION_WIDTH: number
        RECOGNIZE_THRESHOLD: number
        FONT: string
      }>

      addPartHandler: () => void
      addPlaceHandler: () => void
      addFastenerHandler: () => void
      addWasherHandler: () => void
    }
  }
}

export {}
