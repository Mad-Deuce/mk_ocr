import { Monitor } from 'node-screenshots'
import { SCAN_REGION_HEIGHT, SCAN_REGION_WIDTH } from '../../config'

export type Cursor = { x: number; y: number }
export type ScanResult = {
  rgba: Buffer<ArrayBuffer>
  width: number
  height: number
}
type Box = { x: number; y: number; w: number; h: number }

export interface IScanner {
  scan(cursor: Cursor): Promise<ScanResult>
}

export class Scanner implements IScanner {
  public async scan(cursor: Cursor): Promise<ScanResult> {
    //   const cursor = screen.getCursorScreenPoint()
    const left = Math.round(cursor.x - SCAN_REGION_WIDTH / 2)
    const top = Math.round(cursor.y - SCAN_REGION_HEIGHT / 2)
    const rgba = await this.captureVirtualRegion({
      x: left,
      y: top,
      w: SCAN_REGION_WIDTH,
      h: SCAN_REGION_HEIGHT
    })

    return { rgba, width: SCAN_REGION_WIDTH, height: SCAN_REGION_HEIGHT }
  }

  private async captureVirtualRegion(box: Box): Promise<Buffer<ArrayBuffer>> {
    // White padding is appropriate for the configured light-background mode.
    const out = Buffer.alloc(box.w * box.h * 4, 255)
    const monitors = Monitor.all()
    for (const monitor of monitors) {
      const bounds = {
        x: monitor.x(),
        y: monitor.y(),
        w: monitor.width(),
        h: monitor.height()
      }
      const part = this.intersect({ x: box.x, y: box.y, w: box.w, h: box.h }, bounds)
      if (!part) continue
      const image = monitor.captureImageSync()
      const raw = image.toRawSync(true) // copyOutputData=true is recommended in Electron.
      const localX = part.x - bounds.x,
        localY = part.y - bounds.y
      for (let row = 0; row < part.h; row++) {
        const srcStart = ((localY + row) * bounds.w + localX) * 4
        const dstStart = ((part.y - box.y + row) * box.w + (part.x - box.x)) * 4
        raw.copy(out, dstStart, srcStart, srcStart + part.w * 4)
      }
    }
    return out
  }

  private intersect(a: Box, b: Box): Box | null {
    const left = Math.max(a.x, b.x),
      top = Math.max(a.y, b.y)
    const right = Math.min(a.x + a.w, b.x + b.w),
      bottom = Math.min(a.y + a.h, b.y + b.h)
    return right > left && bottom > top
      ? { x: left, y: top, w: right - left, h: bottom - top }
      : null
  }
}
