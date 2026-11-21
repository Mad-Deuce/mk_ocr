export type ExcelScalar = string | number | boolean | null

export interface ExcelSheetInfo {
  name: string
  rowCount: number
  headers: string[]
}

export interface ExcelConfig {
  filePath: string
  sheetName: string
  headerRow: number
  keyColumn: 'Позиция'
  displayColumns: readonly ['Имя', 'Позиция', 'Обозначение', 'Кол', 'Кол.конт']
  editableColumns: readonly ['Кол.конт']
}

export interface RecordSnapshot {
  filePath: string
  sheetName: string
  rowNumber: number
  position: number
  values: {
    Name: ExcelScalar
    Position: ExcelScalar
    Designation: ExcelScalar
    TotalQuantity: ExcelScalar
    UsedQuantity: ExcelScalar
  }
}

export type SearchResult =
  | { status: 'found'; record: RecordSnapshot; duplicateCount: number }
  | { status: 'not-found'; position: number }
  | { status: 'error'; message: string }

export type SaveResult =
  | { status: 'saved'; value: number }
  | { status: 'conflict'; message: string }
  | { status: 'file-locked'; message: string }
  | { status: 'error'; message: string }
