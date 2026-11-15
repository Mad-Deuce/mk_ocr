import { app } from 'electron'
import fs from 'node:fs'
import { join } from 'node:path'

export function logOCR(text: string): void {
  console.log('in log function')

  const logPath = join(app.getPath('userData'), 'ocr.log')

  fs.appendFileSync(logPath, `[${new Date().toLocaleString()}] ${text}\n`, 'utf8')

  console.log(logPath)
  console.log(text)
}
