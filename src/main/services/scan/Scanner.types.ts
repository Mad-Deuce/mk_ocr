export type Cursor = { x: number; y: number }
export type ScanResult = {
  rgba: Buffer<ArrayBuffer>
  width: number
  height: number
}
export type Box = { x: number; y: number; w: number; h: number }

export interface IScanner {
  scan(cursor: Cursor): Promise<ScanResult>
}
