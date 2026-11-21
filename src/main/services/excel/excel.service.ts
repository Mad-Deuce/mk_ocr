import winax from 'winax'

export class ExcelService {
  private static WORKBOOK_NAME_TEMPLATE = 'Строки спецификации'
  private static WORKSHEET_NAME_TEMPLATE = 'Снимок экрана'

  private static excel: winax.Object
  private static workbook: winax.Object
  private static specificationWorksheet: winax.Object

  public static getSpecificationWorksheet(): winax.Object {
    if (!ExcelService.workbook) {
      ExcelService.openWorkbook()
    }

    if (!ExcelService.specificationWorksheet) {
      ExcelService.specificationWorksheet =
        ExcelService.workbook.Worksheets.Item(
          ExcelService.WORKSHEET_NAME_TEMPLATE
        )
    }

    return ExcelService.specificationWorksheet
  }

  private static openWorkbook(): void {
    // Подключаемся к существующему Excel
    ExcelService.excel = new winax.Object(
      'Excel.Application',
      { activate: true }
    )

    const workbooks = ExcelService.excel.Workbooks

    // Ищем первую подходящую книгу
    for (let i = 1; i <= workbooks.Count; i++) {
      const workbook = workbooks.Item(i)

      if (
        workbook.Name
          .toLowerCase()
          .startsWith(
            ExcelService.WORKBOOK_NAME_TEMPLATE.toLowerCase()
          )
      ) {
        ExcelService.workbook = workbook
        break
      }
    }

    if (!ExcelService.workbook) {
      throw new Error(
        `Workbook starting with "${ExcelService.WORKBOOK_NAME_TEMPLATE}" not found`
      )
    }

    console.log('Connected to workbook:', ExcelService.workbook.Name)
  }
}
