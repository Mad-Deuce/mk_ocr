const winax = require('winax');

console.log('winax loaded:', true);

try {
  // Получаем уже запущенный экземпляр Excel
  const excel = new winax.Object(
    'Excel.Application',
    { activate: true }
  );

  console.log('Excel version:', excel.Version);
  console.log('Open workbooks:', excel.Workbooks.Count);

  const workbooks = excel.Workbooks;

  for (let i = 1; i <= workbooks.Count; i++) {
    const workbook = workbooks.Item(i);

    console.log(
      `Workbook ${i}: ${workbook.Name}`
    );
  }

} catch (error) {
  console.error('Excel COM error:', error);
}