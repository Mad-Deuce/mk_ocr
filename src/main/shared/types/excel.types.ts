export type ExcelScalar = string | number | boolean | null

export type SpecificationRecord = {
  rowNumber: number
  name: ExcelScalar
  position: ExcelScalar
  designation: ExcelScalar
  totalQuantity: ExcelScalar
  usedQuantity: ExcelScalar
}
export type Specification = {
  filePath: string
  sheetName: string
  values: SpecificationRecord[]
}
