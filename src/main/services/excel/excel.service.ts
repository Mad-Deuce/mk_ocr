import winax from 'winax'
import { ExcelScalar, Specification, SpecificationRecord } from '../../shared/types/excel.types'

interface IExcelService {
  // getSpecificationWorksheet(): winax.Object
}

export class ExcelService implements IExcelService {
  private static WORKBOOK_NAME_TEMPLATE = 'Строки спецификации'
  private static WORKSHEET_NAME_TEMPLATE = 'Снимок экрана'

  private static excel: winax.Object
  private static workbook: winax.Object
  private static specificationWorksheet: winax.Object

  private static specification: Specification | undefined

  public static initExcelService(): void {
    if (!this.workbook) {
      this.openWorkbook()
    }

    if (!this.specificationWorksheet) {
      this.specificationWorksheet = this.workbook.Worksheets.Item(this.WORKSHEET_NAME_TEMPLATE)
    }

    this.specification = this.createSpecification()
  }

  public static findRecordByPosition(position: ExcelScalar): SpecificationRecord | undefined {
    return this.specification?.values.find((value) => value.position === position)
  }

  private static openWorkbook(): void {
    // Connecting to exists Excel
    ExcelService.excel = new winax.Object('Excel.Application', { activate: true })

    const workbooks = ExcelService.excel.Workbooks

    // Find first workbook by name template
    for (let i = 1; i <= workbooks.Count; i++) {
      const workbook = workbooks.Item(i)

      if (
        workbook.Name.toLowerCase().startsWith(ExcelService.WORKBOOK_NAME_TEMPLATE.toLowerCase())
      ) {
        ExcelService.workbook = workbook
        break
      }
    }

    if (!ExcelService.workbook) {
      throw new Error(`Workbook starting with "${ExcelService.WORKBOOK_NAME_TEMPLATE}" not found`)
    }

    console.log('Connected to workbook:', ExcelService.workbook.Name)
  }

  private static createSpecification(): Specification {
    const result: Specification = {
      filePath: this.workbook.FullName,
      sheetName: this.specificationWorksheet.Name,
      values: []
    }

    const cfg = {
      NAME_COLUMN_IDX: 4,
      POSITION_COLUMN_IDX: 5,
      DESIGNATION_COLUMN_IDX: 6,
      TOTAL_QUANTITY_COLUMN_IDX: 9,
      USED_QUANTITY_COLUMN_IDX: 10
    }

    const worksheet = this.specificationWorksheet

    const values = worksheet.UsedRange.value() as unknown[][]

    values.forEach((row, rowNumber) => {
      if (Number(row[cfg.POSITION_COLUMN_IDX])) {
        const record: SpecificationRecord = {
          rowNumber: rowNumber + 1,
          name: row[cfg.NAME_COLUMN_IDX] as ExcelScalar,
          position: row[cfg.POSITION_COLUMN_IDX] as ExcelScalar,
          designation: row[cfg.DESIGNATION_COLUMN_IDX] as ExcelScalar,
          totalQuantity: row[cfg.TOTAL_QUANTITY_COLUMN_IDX] as ExcelScalar,
          usedQuantity: row[cfg.USED_QUANTITY_COLUMN_IDX] as ExcelScalar
        }
        result.values.push(record)
      }
    })

    return result
  }
}
