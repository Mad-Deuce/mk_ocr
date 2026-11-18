export type Box = { x: number; y: number; w: number; h: number }
export type BoxWithPixels = Box & { pixels: number }
export type Template = { mask: Uint8Array; minX: number; minY: number; box: Box }

export type Digit = { digit: string; score: number } & Box
export type RecognizeResult = {
  text: string
  confidence: number
  threshold: number
  count: number
  boxes: Digit[]
}
